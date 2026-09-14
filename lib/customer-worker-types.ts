import { ObjectId, type Db } from "mongodb";

export async function ensureCustomerWorkerTypes(
  db: Db,
  customerAccountId: ObjectId
) {
  const customer = await db.collection("users").findOne({
    _id: customerAccountId,
    role: "customer",
  });

  if (!customer) {
    throw new Error("Customer account not found");
  }

  // These are idempotent. MongoDB creates the collection automatically on
  // first use, so no manual collection creation is required.
  await db.collection("customer_worker_types").createIndex(
    { customer_account_id: 1, value: 1 },
    { unique: true }
  );
  await db
    .collection("customer_worker_types")
    .createIndex({ customer_account_id: 1 });

  if (customer.workerTypesInitialized) {
    return;
  }

  const globalWorkerTypes = await db
    .collection("worker-types")
    .find({})
    .toArray();
  const now = new Date();

  for (const workerType of globalWorkerTypes) {
    await db.collection("customer_worker_types").updateOne(
      {
        customer_account_id: customerAccountId,
        value: workerType.value,
      },
      {
        $setOnInsert: {
          customer_account_id: customerAccountId,
          source_worker_type_id: workerType._id,
          name: workerType.name,
          value: workerType.value,
          dayRate: Number(workerType.dayRate) || 0,
          overtimeRate: Number(workerType.overtimeRate) || 0,
          icon: workerType.icon || "HardHat",
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );
  }

  // The flag is important: if an Admin later removes one type for this
  // customer, it must not be copied back automatically.
  await db.collection("users").updateOne(
    { _id: customerAccountId },
    {
      $set: {
        workerTypesInitialized: true,
        updatedAt: now,
      },
    }
  );
}
