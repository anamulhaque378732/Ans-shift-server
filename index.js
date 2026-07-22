const express = require("express");

require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_SECRET);

const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// firebase  admin  new version

const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const serviceAccount = require("./ans-shift-firebase-adminsdk.json");

initializeApp({
  credential: cert(serviceAccount),
});

//  tracking id

const crypto = require("crypto");

function generateTrackingId() {
  const prefix = "PRCL";

  // Example: 20260630
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  // Generate 6 random hexadecimal characters
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();

  // Final Tracking ID
  return `${prefix}-${date}-${random}`;
}

// Force Node.js to use Cloudflare and Google public DNS

const dns = require("node:dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

// middleware

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uzupc.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization;
  // console.log(token);

  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  try {
    const tokenId = token.split(" ")[1];
    const decoded = await getAuth().verifyIdToken(tokenId);

    req.decoded_email = decoded.email;
    next();
  } catch (error) {
    console.error("Firebase Verify Error:", error);
    return res.status(401).send({ message: "Unauthorized access" });
  }
};

async function run() {
  try {
    await client.connect();

    const db = client.db("ans_shift_db");

    // parcel collection

    const parcelCollection = db.collection("parcels");

    // payment collection

    const paymentCollection = db.collection("payments");

    // user collection

    const userCollection = db.collection("users");

    // raider collection

    const raiderCollection = db.collection("raiders");

    // middle  admin before allowing admin activity
    // must be used after verifyFirebaseToken middleware

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded_email;
      const query = { email };
      const user = await userCollection.findOne(query);

      if (!user || user.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }

      next();
    };

    // ***************** parcel related all api *********************

    app.get("/parcels", async (req, res) => {
      const query = {};

      const { email, deliveryStatus } = req.query;

      //  /parcels?email=""&
      if (email) {
        query.senderEmail = email;
      }

      if (deliveryStatus) {
        query.deliveryStatus = deliveryStatus;
      }

      const options = { sort: { createdAt: -1 } };

      const cursor = parcelCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });

    // raider related data load, assigned deliver

    app.get("/parcels/raider", async (req, res) => {
      const { raiderEmail, deliveryStatus } = req.query;
      const query = {};

      if (raiderEmail) {
        query.raiderEmail = raiderEmail;
      }
      if (deliveryStatus) {
        query.deliveryStatus = { $in: ["driver_assign", "Raider_arriving"] };
      }

      const cursor = parcelCollection.find(query);

      const result = await cursor.toArray();

      res.send(result);
    });

    // payment data load related parcel

    app.get("/parcels/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const result = await parcelCollection.findOne(query);
      res.send(result);
    });

    // parcels related api

    app.post("/parcels", async (req, res) => {
      const parcel = req.body;
      // parcel created time
      parcel.createdAt = new Date();

      const result = await parcelCollection.insertOne(parcel);
      res.send(result);
    });

    // update parcel

    // ToDo : Rename this to be specific like /parcel/:id/assign

    app.patch("/parcels/:id", async (req, res) => {
      const { raiderId, raiderName, raiderEmail } = req.body;
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const updatedDoc = {
        $set: {
          deliveryStatus: "driver_assign",
          raiderId: raiderId,
          raiderName: raiderName,
          raiderEmail: raiderEmail,
        },
      };

      const result = await parcelCollection.updateOne(query, updatedDoc);

      // update raider information
      const raiderQuery = { _id: new ObjectId(raiderId) };

      const raiderUpdatedDoc = {
        $set: {
          workStatus: "in_delivery",
        },
      };
      const raiderResult = await raiderCollection.updateOne(
        raiderQuery,
        raiderUpdatedDoc,
      );

      res.send(raiderResult);
    });

    // assign raider arriving

    app.patch("/parcels/:id/status", async (req, res) => {
      const { deliveryStatus } = req.body;

      const query = { _id: new ObjectId(req.params.id) };

      const updatedDoc = {
        $set: {
          deliveryStatus: deliveryStatus,
        },
      };

      const result = await parcelCollection.updateOne(query, updatedDoc);

      res.send(result);
    });

    // parcel delete one

    app.delete("/parcels/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const result = await parcelCollection.deleteOne(query);

      res.send(result);
    });

    //  ******** user get related api all api *******************

    // user get

    app.get("/users", verifyFirebaseToken, async (req, res) => {
      const searchText = req.query.searchText;

      const query = {};

      if (searchText) {
        // way one : search bye name
        // query.displayName = { $regex: searchText, $options: "i" };

        // way two  : search name and email
        query.$or = [
          { displayName: { $regex: searchText, $options: "i" } },
          { email: { $regex: searchText, $options: "i" } },
        ];
      }

      const cursor = userCollection.find(query).sort({ createdAt: -1 });

      const result = await cursor.toArray();
      res.send(result);
    });

    //  set role in the website in email

    app.get("/users/:email/role", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);

      res.send({ role: user?.role || "user" });
    });

    // set role in the website in id

    app.get("/users/:id", async (req, res) => {});

    // user post related api

    app.post("/users", async (req, res) => {
      const user = req.body;

      user.role = "user";
      user.createdAt = new Date();
      const email = user.email;
      const userExists = await userCollection.findOne({ email: email });

      if (userExists) {
        return res.send({ message: "User exists" });
      }
      const result = await userCollection.insertOne(user);

      res.send(result);
    });

    // update user Patch

    app.patch(
      "/users/:id/role",
      verifyFirebaseToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const roleInfo = req.body;

        const query = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: { role: roleInfo.role },
        };

        const result = await userCollection.updateOne(query, updatedDoc);

        res.send(result);
      },
    );

    //  *******  raider related all api   *******

    // raider data load get

    app.get("/raiders", async (req, res) => {
      const { status, district, workStatus } = req.query;
      const query = {};
      if (status) {
        query.status = status;
      }

      if (district) {
        query.district = district;
      }

      if (workStatus) {
        query.workStatus = workStatus;
      }

      const cursor = raiderCollection.find(query).sort({ createdAt: -1 });

      const result = await cursor.toArray();

      res.send(result);
    });

    // raider related api post

    app.post("/raiders", async (req, res) => {
      const raider = req.body;

      raider.status = "pending";

      raider.createdAt = new Date();

      const result = await raiderCollection.insertOne(raider);

      res.send(result);
    });

    // verify raider / accept raider

    app.patch(
      "/raiders/:id",
      verifyFirebaseToken,
      verifyAdmin,
      async (req, res) => {
        const status = req.body.status;
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        const updatedDoc = {
          $set: {
            status: status,
            workStatus: "available",
          },
        };

        const result = await raiderCollection.updateOne(query, updatedDoc);

        if (status === "approved") {
          const email = req.body.email;
          const userQuery = { email: email };
          const updateUser = {
            $set: {
              role: "raider",
            },
          };
          const userResult = await userCollection.updateOne(
            userQuery,
            updateUser,
          );
        }

        res.send(result);
      },
    );

    //  Delete a single raider raider

    app.delete("/raiders/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const result = await raiderCollection.deleteOne(query);

      res.send(result);
    });

    // ********* payment related all  api ********

    // payment get

    app.get("/payments", verifyFirebaseToken, async (req, res) => {
      const email = req.query.email;
      const query = {};

      if (email) {
        query.customerEmail = email;

        // check email address

        if (email !== req.decoded_email) {
          return res.status(403).send({ message: "forbidden access" });
        }
      }
      const cursor = paymentCollection.find(query).sort({ paidAt: -1 });

      const result = await cursor.toArray();

      res.send(result);
    });

    // payment related api new post

    app.post("/payment-checkout-session", async (req, res) => {
      const paymentInfo = req.body;
      const amount = parseInt(paymentInfo.cost) * 100;
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              unit_amount: amount,
              currency: "USD",
              product_data: {
                name: `Please pay for: ${paymentInfo.parcelName}`,
              },
            },
            quantity: 1,
          },
        ],

        mode: "payment",

        metadata: {
          parcelId: paymentInfo.parcelId,
          parcelName: paymentInfo.parcelName,
        },

        customer_email: paymentInfo.senderEmail,
        success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
      });
      res.send({ url: session.url });
    });

    //payment related api old

    // app.post("/create-checkout-session", async (req, res) => {
    //   const paymentInfo = req.body;

    //   const amount = parseInt(paymentInfo.cost) * 100;

    //   const session = await stripe.checkout.sessions.create({
    //     line_items: [
    //       {
    //         price_data: {
    //           currency: "USD",
    //           unit_amount: 150,
    //           product_data: {
    //             name: paymentInfo.parcelName,
    //           },
    //         },

    //         quantity: 1,
    //       },
    //     ],
    //     customer_email: paymentInfo.senderEmail,
    //     mode: "payment",
    //     metadata: {
    //       parcelId: paymentInfo.parcelId,
    //     },
    //     success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success`,
    //     cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
    //   });

    //   res.send({ url: session.url });
    // });

    // verify payment

    // payment related api patch

    app.patch("/payment-success", async (req, res) => {
      const sessionId = req.query.session_id;
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      const transactionId = session.payment_intent;

      const query = { transactionId: transactionId };

      const paymentExist = await paymentCollection.findOne(query);

      if (paymentExist) {
        return res.send({
          message: "already exists",
          transactionId: transactionId,
          trackingId: paymentExist.trackingId,
        });
      }

      const trackingId = generateTrackingId();

      if (session.payment_status === "paid") {
        const id = session.metadata.parcelId;
        const query = {
          _id: new ObjectId(id),
        };

        const update = {
          $set: {
            paymentStatus: "paid",
            deliveryStatus: "pending-pickup",
            trackingId: trackingId,
          },
        };
        const result = await parcelCollection.updateOne(query, update);

        const payment = {
          amount: session.amount_total / 100,
          currency: session.currency,
          customerEmail: session.customer_email,
          parcelId: session.metadata.parcelId,
          parcelName: session.metadata.parcelName,
          transactionId: session.payment_intent,
          paymentStatus: session.payment_status,
          paidAt: new Date(),
          trackingId: trackingId,
        };

        if (session.payment_status === "paid") {
          const resultPayment = await paymentCollection.insertOne(payment);
          res.send({
            success: true,
            modifyParcel: result,
            trackingId: trackingId,
            transactionId: session.payment_intent,
            paymentInfo: resultPayment,
          });
        }
      }
    });

    // Send a ping to confirm a successful connection

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
