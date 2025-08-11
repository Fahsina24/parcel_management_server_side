require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//middleware

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_PARCEL}:${process.env.DB_PASS}@cluster0.ymvbd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const userCollection = client.db("parcelDB").collection("users");
    const parcelCollection = client.db("parcelDB").collection("bookedParcels");
    // save or update users
    app.post("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = req.body;
      // console.log(user);
      const existUser = await userCollection.findOne(query);
      if (existUser) {
        // console.log("user exists before");
        return res.send(existUser);
      } else {
        const result = await userCollection.insertOne({
          ...user,
        });
        // console.log(result);
        return res.send(result);
      }
    });

    // parcelsBooking Api
    app.post("/bookedParcels", async (req, res) => {
      const result = req.body;
      // console.log(result);
      const parcelInfo = await parcelCollection.insertOne(result);
      res.send(parcelInfo);
    });

    // get all Parcels
    app.get("/allParcels", async (req, res) => {
      const allParcels = await parcelCollection.find().toArray();
      // console.log(cursor);
      res.send(allParcels);
    });

    // get my parcels by email
    app.get("/myParcels/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const myParcels = await parcelCollection
        .find({
          buyerEmail: email,
        })
        .toArray();
      // console.log(myParcels);
      res.send(myParcels);
    });

    // get parcels by id
    app.get("/singleParcel/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      // console.log(query);
      const singleParcels = await parcelCollection.findOne(query);
      return res.send(singleParcels);
    });

    app.get("/", async (req, res) => {
      res.send("application is running");
    });

    //Update single parcels info by id

    app.patch("/update/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          buyerEmail: data?.buyerEmail,
          buyerName: data?.buyerName,
          buyerPhoneNo: data?.buyerPhoneNo,
          deliveryAddress: data?.deliveryAddress,
          deliveryDate: data?.deliveryDate,
          latitude: data?.latitude,
          longitude: data?.longitude,
          parcelType: data?.parcelType,
          parcelWeight: data?.parcelWeight,
          price: data?.price,
          receiverName: data?.receiverName,
          receiverPhoneNo: data?.receiverPhoneNo,
          status: data?.status,
        },
      };
      const result = await parcelCollection.updateOne(query, update);
      res.json(result);
    });

    // update booking details when clicking the manage Button
    app.patch("/bookingDetailsUpdate/:id", async (req, res) => {
      // console.log("hii");
      const id = req.params.id;
      const data = req.body;
      // console.log(id, data);
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          status: data?.status,
          deliveryMenId: data?.deliveryMenId,
          approximateDeliveryDate: data?.approximateDeliveryDate,
        },
      };

      const result = await parcelCollection.updateOne(query, update, {
        upsert: true,
      });
      // console.log(result);
      res.json(result);
    });

    // Get specific user information
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.find({ email }).toArray();
      res.send(result);
    });

    // Get All users
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //Get users by their type
    app.get("/userType/:deliveryMen", async (req, res) => {
      const result = await userCollection
        .find({ userType: "DeliveryMen" })
        .toArray();
      res.send(result);
    });

    // Get users details by their name
    app.get("/user/:name", async (req, res) => {
      const displayName = req.params.name;
      const result = await userCollection.find({ displayName }).toArray();
      res.send(result);
    });

    // get user profile
    app.get("/userProfile/:email", async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });
      res.send(result);
    });

    // update user profile
    app.patch("/userProfile/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const response = req.body;
      // console.log(email, query, response);
      const update = {
        $set: {
          photoURL: req.body.photoURL,
        },
      };
      // console.log(update);
      const result = await userCollection.updateOne(query, update);
      res.json(result);
    });

    //update user information by adding phone number fields
    app.get("/allUsersDetails", async (req, res) => {
      const result = await userCollection
        .aggregate([
          {
            $lookup: {
              from: "bookedParcels",
              localField: "email",
              foreignField: "buyerEmail",
              as: "ParcelsInfo",
            },
          },
          {
            $addFields: {
              buyerPhoneNo: {
                $ifNull: [
                  "$buyerPhoneNo",
                  { $arrayElemAt: ["$ParcelsInfo.buyerPhoneNo", 0] }, // else from bookedParcels
                ],
              },
            },
          },
        ])
        .toArray();
      res.json(result);
    });

    // Cancel Function

    app.patch("/cancel/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          status: "cancelled",
        },
      };
      const result = await parcelCollection.updateOne(query, update);
      res.json(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(3000, () => {
  // console.log("application is running");
});
