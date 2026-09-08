const path = require("path");
const dotenv = require("dotenv");
const {
  MongoClient,
  ObjectId,
} = require("mongodb");

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

const APPLY_CHANGES = process.argv.includes("--apply");

/*
  If an old job cannot be matched automatically, add its
  job ObjectId and customer login email here.

  Example:
  "66ab12345678901234567890": "plantplan@example.com",
*/
const MANUAL_JOB_TO_CUSTOMER_EMAIL = {};

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function validObjectId(value) {
  return Boolean(value) && ObjectId.isValid(String(value));
}

async function runMigration() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI is missing from .env.local"
    );
  }

  const mongoClient = new MongoClient(mongoUri);

  try {
    await mongoClient.connect();

    const db = mongoClient.db();

    const customers = await db
      .collection("users")
      .find({
        role: "customer",
      })
      .project({
        password: 0,
      })
      .toArray();

    const clientRecords = await db
      .collection("clients")
      .find({})
      .toArray();

    const jobs = await db
      .collection("jobs")
      .find({})
      .sort({
        createdAt: 1,
      })
      .toArray();

    const customersById = new Map();
    const customersByEmail = new Map();
    const customersByName = new Map();
    const clientsById = new Map();

    for (const customer of customers) {
      customersById.set(
        customer._id.toString(),
        customer
      );

      if (customer.email) {
        customersByEmail.set(
          normalize(customer.email),
          customer
        );
      }

      const possibleNames = [
        customer.company,
        customer.name,
      ];

      for (const possibleName of possibleNames) {
        const normalizedName = normalize(possibleName);

        if (!normalizedName) {
          continue;
        }

        const existing =
          customersByName.get(normalizedName) || [];

        const alreadyAdded = existing.some(
          (item) =>
            item._id.toString() ===
            customer._id.toString()
        );

        if (!alreadyAdded) {
          existing.push(customer);
        }

        customersByName.set(
          normalizedName,
          existing
        );
      }
    }

    for (const clientRecord of clientRecords) {
      clientsById.set(
        clientRecord._id.toString(),
        clientRecord
      );
    }

    function getUniqueCustomerByName(value) {
      const matches =
        customersByName.get(normalize(value)) || [];

      return matches.length === 1
        ? matches[0]
        : null;
    }

    function resolveCustomer(job) {
      const jobId = job._id.toString();

      const manualEmail =
        MANUAL_JOB_TO_CUSTOMER_EMAIL[jobId];

      if (manualEmail) {
        const manualCustomer =
          customersByEmail.get(
            normalize(manualEmail)
          );

        if (manualCustomer) {
          return {
            customer: manualCustomer,
            source: "manual-job-map",
          };
        }

        return null;
      }

      if (validObjectId(job.customer_account_id)) {
        const linkedCustomer = customersById.get(
          String(job.customer_account_id)
        );

        if (linkedCustomer) {
          return {
            customer: linkedCustomer,
            source: "existing-customer-account-id",
          };
        }
      }

      const possibleEmails = [
        job.clientEmail,
        job.customerEmail,
        job.jobEstimate?.customerEmail,
      ];

      for (const email of possibleEmails) {
        const matchingCustomer =
          customersByEmail.get(normalize(email));

        if (matchingCustomer) {
          return {
            customer: matchingCustomer,
            source: "customer-email",
          };
        }
      }

      if (validObjectId(job.clientId)) {
        const directCustomer = customersById.get(
          String(job.clientId)
        );

        if (directCustomer) {
          return {
            customer: directCustomer,
            source: "legacy-client-id-is-user-id",
          };
        }

        const legacyClient = clientsById.get(
          String(job.clientId)
        );

        if (legacyClient) {
          const linkedAccountId =
            legacyClient.customerAccountId ||
            legacyClient.customer_account_id;

          if (validObjectId(linkedAccountId)) {
            const linkedCustomer = customersById.get(
              String(linkedAccountId)
            );

            if (linkedCustomer) {
              return {
                customer: linkedCustomer,
                source: "linked-client-record",
              };
            }
          }

          const customerFromClientName =
            getUniqueCustomerByName(
              legacyClient.name
            );

          if (customerFromClientName) {
            return {
              customer: customerFromClientName,
              source: "unique-client-record-name",
            };
          }
        }
      }

      const possibleNames = [
        job.clientCompany,
        job.customerCompany,
        job.clientName,
        job.customerName,
      ];

      for (const name of possibleNames) {
        const matchingCustomer =
          getUniqueCustomerByName(name);

        if (matchingCustomer) {
          return {
            customer: matchingCustomer,
            source: "unique-customer-name",
          };
        }
      }

      return null;
    }

    let matched = 0;
    let migrated = 0;
    let unresolved = 0;

    console.log(
      APPLY_CHANGES
        ? "APPLY MODE: database records will be updated."
        : "DRY-RUN MODE: no database records will be changed."
    );

    for (const job of jobs) {
      const resolved = resolveCustomer(job);

      if (!resolved) {
        unresolved += 1;

        console.warn(
          `UNRESOLVED | Job ${job._id} | ` +
            `${job.jobName || "Unnamed job"} | ` +
            `${job.clientName || "No client"}`
        );

        continue;
      }

      matched += 1;

      const customer = resolved.customer;

      console.log(
        `MATCHED | Job ${job._id} | ` +
          `${customer.email} | ${resolved.source}`
      );

      if (!APPLY_CHANGES) {
        continue;
      }

      let linkedClient = await db
        .collection("clients")
        .findOne({
          $or: [
            {
              customerAccountId: customer._id,
            },
            {
              customerAccountId:
                customer._id.toString(),
            },
            {
              customer_account_id: customer._id,
            },
            {
              customer_account_id:
                customer._id.toString(),
            },
          ],
        });

      const oldClient =
        validObjectId(job.clientId)
          ? await db.collection("clients").findOne({
              _id: new ObjectId(job.clientId),
            })
          : null;

      if (
        !linkedClient &&
        oldClient &&
        !oldClient.customerAccountId &&
        !oldClient.customer_account_id
      ) {
        await db.collection("clients").updateOne(
          {
            _id: oldClient._id,
          },
          {
            $set: {
              customerAccountId: customer._id,
              updatedAt: new Date(),
            },
          }
        );

        linkedClient = {
          ...oldClient,
          customerAccountId: customer._id,
        };
      }

      if (!linkedClient) {
        const clientInsertResult = await db
          .collection("clients")
          .insertOne({
            name:
              customer.company ||
              customer.name ||
              customer.email,
            description:
              "Linked by WAR-PORT-038 migration",
            customerAccountId: customer._id,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

        linkedClient = await db
          .collection("clients")
          .findOne({
            _id: clientInsertResult.insertedId,
          });
      }

      if (!linkedClient) {
        console.error(
          `FAILED | Could not create client record for job ${job._id}`
        );

        continue;
      }

      await db.collection("jobs").updateOne(
        {
          _id: job._id,
        },
        {
          $set: {
            customer_account_id: customer._id,
            clientId: linkedClient._id.toString(),
            clientName:
              job.clientName ||
              linkedClient.name ||
              customer.company ||
              customer.name,
            clientEmail: customer.email,
            clientPhone:
              job.clientPhone ||
              customer.phone ||
              null,
            clientCompany:
              job.clientCompany ||
              customer.company ||
              null,
            customerAccountLinkSource:
              resolved.source,
            customerAccountLinkedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      migrated += 1;
    }

    console.log("");
    console.log("Migration summary");
    console.log(`Total jobs: ${jobs.length}`);
    console.log(`Matched jobs: ${matched}`);
    console.log(`Updated jobs: ${migrated}`);
    console.log(`Unresolved jobs: ${unresolved}`);

    if (!APPLY_CHANGES) {
      console.log("");
      console.log(
        "No changes were made. Review every match first."
      );
      console.log(
        "Use --apply only after resolving incorrect or missing matches."
      );
    }
  } finally {
    await mongoClient.close();
  }
}

runMigration().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});