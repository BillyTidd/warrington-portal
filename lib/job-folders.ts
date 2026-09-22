import { ObjectId, type Db } from "mongodb";

const AUTOMATIC_SUFFIX_PATTERN =
  /(?:[\s_-]+(?:#\s*)?\d+|\s*\(\s*\d+\s*\))$/;

let indexPromise: Promise<unknown> | null = null;

export function normalizeFolderName(value: string): string {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("en-GB")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function getAutomaticFolderName(jobName: unknown): string | null {
  if (typeof jobName !== "string") {
    return null;
  }

  const cleanedName = jobName.trim().replace(/\s+/g, " ");

  if (!cleanedName) {
    return null;
  }

  const baseName = cleanedName
    .replace(AUTOMATIC_SUFFIX_PATTERN, "")
    .trim();

  return baseName || cleanedName;
}

export async function ensureJobFolderIndexes(db: Db) {
  if (!indexPromise) {
    indexPromise = Promise.all([
      db.collection("job_folders").createIndex(
        {
          customerAccountId: 1,
          normalizedName: 1,
        },
        {
          unique: true,
          name: "unique_customer_folder_name",
        }
      ),
      db.collection("job_folders").createIndex(
        {
          customerAccountId: 1,
          name: 1,
        },
        {
          name: "customer_folder_name",
        }
      ),
      db.collection("jobs").createIndex(
        {
          customer_account_id: 1,
          folderId: 1,
        },
        {
          name: "customer_job_folder",
        }
      ),
    ]).catch((error) => {
      indexPromise = null;
      throw error;
    });
  }

  await indexPromise;
}

export async function buildCustomerJobsQuery(
  db: Db,
  customerAccountId: ObjectId
) {
  const accountId = customerAccountId.toString();

  const linkedClients = await db
    .collection("clients")
    .find(
      {
        $or: [
          { customerAccountId },
          { customerAccountId: accountId },
          { customer_account_id: customerAccountId },
          { customer_account_id: accountId },
        ],
      },
      {
        projection: { _id: 1 },
      }
    )
    .toArray();

  const linkedClientIds = linkedClients.flatMap((client) => [
    client._id,
    client._id.toString(),
  ]);

  return {
    $or: [
      { customer_account_id: customerAccountId },
      { customer_account_id: accountId },
      { customerAccountId: customerAccountId },
      { customerAccountId: accountId },
      { clientId: customerAccountId },
      { clientId: accountId },
      ...(linkedClientIds.length > 0
        ? [{ clientId: { $in: linkedClientIds } }]
        : []),
    ],
  };
}

export async function resolveJobCustomerAccountId(
  db: Db,
  job: Record<string, any>
): Promise<ObjectId | null> {
  const directAccountId =
    job.customer_account_id || job.customerAccountId;

  if (
    directAccountId &&
    ObjectId.isValid(directAccountId.toString())
  ) {
    return new ObjectId(directAccountId.toString());
  }

  if (!job.clientId || !ObjectId.isValid(job.clientId.toString())) {
    return null;
  }

  const clientId = new ObjectId(job.clientId.toString());

  const linkedClient = await db.collection("clients").findOne({
    _id: clientId,
  });

  const linkedAccountId =
    linkedClient?.customerAccountId ||
    linkedClient?.customer_account_id;

  if (
    linkedAccountId &&
    ObjectId.isValid(linkedAccountId.toString())
  ) {
    return new ObjectId(linkedAccountId.toString());
  }

  const customerUser = await db.collection("users").findOne({
    _id: clientId,
    role: "customer",
  });

  return customerUser ? customerUser._id : null;
}

export async function syncAutomaticJobFolders(
  db: Db,
  customerAccountId: ObjectId
) {
  await ensureJobFolderIndexes(db);

  const customerJobsQuery = await buildCustomerJobsQuery(
    db,
    customerAccountId
  );

  const eligibleJobs = await db
    .collection("jobs")
    .find(
      {
        $and: [
          customerJobsQuery,
          {
            $or: [
              { folderAssignment: { $exists: false } },
              { folderAssignment: null },
              { folderAssignment: "automatic" },
            ],
          },
        ],
      },
      {
        projection: {
          _id: 1,
          jobName: 1,
          folderAssignment: 1,
        },
      }
    )
    .toArray();

  const groups = new Map<
    string,
    { displayName: string; jobIds: ObjectId[] }
  >();

  eligibleJobs.forEach((job) => {
    const displayName = getAutomaticFolderName(job.jobName);

    if (!displayName) {
      return;
    }

    const normalizedName = normalizeFolderName(displayName);

    if (!normalizedName) {
      return;
    }

    const existingGroup = groups.get(normalizedName);

    if (existingGroup) {
      existingGroup.jobIds.push(job._id);
      return;
    }

    groups.set(normalizedName, {
      displayName,
      jobIds: [job._id],
    });
  });

  const repeatedGroups = Array.from(groups.entries()).filter(
    ([, group]) => group.jobIds.length >= 2
  );

  const groupedJobIds = repeatedGroups.flatMap(
    ([, group]) => group.jobIds
  );

  const automaticallyAssignedJobs = eligibleJobs
    .filter(
      (job) =>
        job.folderAssignment === "automatic" &&
        !groupedJobIds.some((jobId) => jobId.equals(job._id))
    )
    .map((job) => job._id);

  if (automaticallyAssignedJobs.length > 0) {
    await db.collection("jobs").updateMany(
      {
        _id: { $in: automaticallyAssignedJobs },
      },
      {
        $unset: {
          folderId: "",
          folderName: "",
          folderAssignment: "",
        },
        $set: {
          folderUpdatedAt: new Date(),
        },
      }
    );
  }

  for (const [normalizedName, group] of repeatedGroups) {
    const now = new Date();
    const folderFilter = {
      customerAccountId,
      normalizedName,
    };

    try {
      await db.collection("job_folders").updateOne(
        folderFilter,
        {
          $setOnInsert: {
            customerAccountId,
            name: group.displayName,
            normalizedName,
            assignmentMode: "automatic",
            createdByRole: "system",
            createdAt: now,
          },
          $set: {
            updatedAt: now,
          },
        },
        {
          upsert: true,
        }
      );
    } catch (error: any) {
      // A concurrent request may create the same unique folder first.
      if (error?.code !== 11000) {
        throw error;
      }
    }

    const folder = await db
      .collection("job_folders")
      .findOne(folderFilter);

    if (!folder) {
      continue;
    }

    await db.collection("jobs").updateMany(
      {
        _id: { $in: group.jobIds },
        folderAssignment: { $ne: "manual" },
      },
      {
        $set: {
          folderId: folder._id,
          folderName: folder.name,
          folderAssignment: "automatic",
          folderUpdatedAt: now,
        },
      }
    );
  }

  const automaticFolders = await db
    .collection("job_folders")
    .find({
      customerAccountId,
      assignmentMode: "automatic",
    })
    .toArray();

  for (const folder of automaticFolders) {
    const jobCount = await db.collection("jobs").countDocuments({
      folderId: folder._id,
    });

    if (jobCount === 0) {
      await db.collection("job_folders").deleteOne({
        _id: folder._id,
      });
    }
  }
}
