const express = require("express");

require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_SECRET);

const cors = require("cors");
console.log(process.env.STRIPE_SECRET);

const app = express();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;

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

async function run() {
  try {
    await client.connect();

    const db = client.db("ans_shift_db");
    const parcelCollection = db.collection("parcels");

    // parcel api

    app.get("/parcels", async (req, res) => {
      const query = {};

      const { email } = req.query;

      //  /parcels?email=""&
      if (email) {
        query.senderEmail = email;
      }

      const options = { sort: { createdAt: -1 } };

      const cursor = parcelCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });

    // payment data load

    app.get("/parcels/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const result = await parcelCollection.findOne(query);
      res.send(result);
    });

    app.post("/parcels", async (req, res) => {
      const parcel = req.body;
      // parcel created time
      parcel.createdAt = new Date();

      const result = await parcelCollection.insertOne(parcel);
      res.send(result);
    });

    // payment related api new

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

    app.patch("/payment-success", async (req, res) => {
      const sessionId = req.query.session_id;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log("session retrieve", session);
      if (session.payment_status === "paid") {
        const id = session.metadata.parcelId;
        const query = {
          _id: new ObjectId(id),
        };

        const update = {
          $set: {
            paymentStatus: "paid",
          },
        };
        const result = await parcelCollection.updateOne(query, update);
        res.send(result);
      }

      res.send({ success: false });
    });

    // parcel delete one

    app.delete("/parcels/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const result = await parcelCollection.deleteOne(query);

      res.send(result);
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

app.get("/", (req, res) => {
  res.send("Hello Ans.shift");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
