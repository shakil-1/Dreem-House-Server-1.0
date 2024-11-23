const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()


const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;


const allowedOrigins = [
  'http://localhost:5173',
 
];

app.use(cors({
  origin:allowedOrigins,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
}));

app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vte07fo.mongodb.net/?retryWrites=true&w=majority`;

console.log(uri);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const apartmentCollection = client.db('DMhouse').collection('apartments')
const userCollection = client.db('DMhouse').collection('users')
const bookingCollection = client.db('DMhouse').collection('bookings')
const announcementCollection = client.db('DMhouse').collection('announcements')
const paymentCollection = client.db('DMhouse').collection('payments')
const couponCollection = client.db('DMhouse').collection('coupons')



app.post('/api/v1/jwt', async (req, res) => {
  try {
    const user = req.body;
    console.log(user);
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    res.send({ token })
    console.log(token);
  } catch (error) {
    console.log(error);
  }
})


const verifyToken = (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: 'unauthorized' })
      }
      req.decoded = decoded;
      next()
    })
  } catch (error) {
    console.log(error);
  }
}

const verifyAdmin = async (req, res, next) => {
  try {
    const email = req.decoded.email;
    const query = { email: email }
    const user = await userCollection.findOne(query)
    const isAdmin = user?.role === 'admin'
    if (!isAdmin) {
      return res.status(403).send({ message: 'forbdden access' })
    }
    next()
  } catch (error) {
    console.log(error);
  }
}



// users related api
app.post('/api/v1/users', async (req, res) => {
  try {
    const user = req.body;
    console.log(user);
    const query = { email: user.email }
    console.log(query)
    const existingUser = await userCollection.findOne(query)
    console.log(existingUser)
    if (existingUser) {
      return res.send({ message: 'user already exist', insertedId: null })
    }
    const result = await userCollection.insertOne(user)
    res.send(result)
    console.log(result);
  } catch (err) {
    console.log(err);
  }
})

app.get('/api/v1/users', async (req, res) => {
  const result = await userCollection.find().toArray()
  res.send(result)
})
app.get('/api/v1/users/:id', async (req, res) => {
  const id = req.params.id
  const query = { _id: new ObjectId(id) }
  const result = await userCollection.deleteOne(query)
  res.send(result)
})


app.get('/api/v1/users/admin/:email', verifyToken, async (req, res) => {
  try {
    const email = req.params.email;
    if (email !== req.decoded.email) {
      return res.status(403).send({ message: 'forbidden access' })
    }
    const query = { email: email }
    const user = await userCollection.findOne(query)
    let admin = false;
    let member = false;
    if (user) {
      admin = user.roles === 'admin';
      member = user.roles === 'member';
    }
    res.send({ admin, member });
  } catch (error) {
    console.log(error);
  }
})
// app.patch('/users/admin/:id', verifyAdmin, async (req, res) => {
//   try {
//     const id = req.params.id
//     const filter = { _id: new ObjectId(id) }
//     const updateDoc = {
//       // $addToSet: { roles: ['admin', 'member'] }
//       $set: { roles: ['member'] }
//     }
//     const result = await userCollection.updateOne(filter, updateDoc)
//     res.send(result)
//   } catch (error) {
//     console.log(error);
//   }
// })


// server side
app.patch('/api/v1/users/admin/:id', async (req, res) => {
  try {
    const id = req.params.id
    const filter = { _id: new ObjectId(id) }
    const updateDoc = {
      $set: { roles: 'member' }
    }
    const result = await userCollection.updateOne(filter, updateDoc)
    res.send(result)
  } catch (error) {
    console.error(error);
  }
});
app.patch('/api/v1/users/admin/user/:id', async (req, res) => {
  try {
    const id = req.params.id
    const filter = { _id: new ObjectId(id) }
    const updateDoc = {
      $unset: { roles: 1 }
    }
    const result = await userCollection.updateOne(filter, updateDoc)
    res.send(result)
  } catch (error) {
    console.error(error);

  }
});


// Coupons related api 
app.post('/api/v1/coupons', async (req, res) => {
  try {
    const coupon = req.body;
    const result = await couponCollection.insertOne(coupon)
    res.send(result)
  } catch (error) {
    console.log(error);
  }
})

app.patch('/api/v1/coupons/:id', async (req, res) => {
  const coupon = req.body;
  const id = req.params.id
  const filter = { _id: new ObjectId(id) }
  const updateDoc = {
    $set: {
      coupon: coupon?.coupon,
      parcentage: coupon?.parcentage,
      description: coupon?.description,
    }
  }
  const result = await couponCollection.updateOne(filter, updateDoc)
  res.send(result)
})

app.get('/api/v1/coupons/:id', async (req, res) => {
  const id = req.params.id
  const query = { _id: new ObjectId(id) }
  const result = await couponCollection.findOne(query)
  res.send(result)
})

app.get('/api/v1/coupons', async (req, res) => {
  try {
    const result = await couponCollection.find().toArray()
    res.send(result)
  } catch (error) {
    console.log(error);
  }
})
// app.delete('/coupons/:id', async(req, res)=>{
//   const id = req.params.id 
//   const query = {_id:new ObjectId(id)}
//   const result = await couponCollection.deleteOne(query)
//   res.send(result)
// })
// app.delete('/coupons/:id', async (req, res) => {
//   const id = req.params.id;
//   const query = { _id: new ObjectId(id) };
//   const result = await couponCollection.deleteOne(query);
//   res.send(result)
//   console.log('result',result)
// })





// announcementCollection
app.post('/api/v1/announcements', async (req, res) => {
  const items = req.body;
  console.log(items);
  const result = await announcementCollection.insertOne(items)
  res.send(result)
  console.log(result);
})

app.get('/api/v1/announcements', async (req, res) => {
  const result = await announcementCollection.find().toArray()
  res.send(result)
  console.log(result);
})

//booking related api 
app.post('/api/v1/bookings', async (req, res) => {
  try {
    const book = req.body;
    console.log(book);
    const result = await bookingCollection.insertOne(book)
    res.send(result)
    console.log(result);
  } catch (error) {
    console.log(error);
  }
})

// patch  
app.patch('/api/v1/bookings/:id', async (req, res) => {
  const item = req.body;
  console.log(item);
  const id = req.params.id
  console.log(id);
  const filter = { _id: new ObjectId(id) }
  console.log(filter);
  const updateDoc = {
    $set: {
      status: item.status
    }
  }
  const result = await bookingCollection.updateOne(filter, updateDoc)
  res.send(result)
  console.log(result);
})


app.get('/api/v1/bookings/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await bookingCollection.findOne(query)
    res.send(result)
    console.log(result);
  } catch (error) {
    console.log(error);
  }
})

app.patch('/api/v1/bookings/:id', verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id
    const filter = { _id: new ObjectId(id) }
    const updateDoc = {
      // $addToSet: { roles: ['admin', 'member'] }
      $set: {
        status: ['checked']
      }
    }
    const result = await userCollection.updateOne(filter, updateDoc)
    res.send(result)
  } catch (error) {
    console.log(error);
  }
})

app.get('/api/v1/bookings', async (req, res) => {
  let query = {}
  if (req.query.email) {
    query = { email: req.query.email }
  }
  const result = await bookingCollection.find(query).toArray()
  res.send(result)
})


// apartment related api
app.post('/api/v1/apainment', async (req, res) => {
  const query = req.body;
  console.log(query);
  const result = await apartmentCollection.insertOne(query)
  res.send(result)
  console.log(result);
})
app.patch('/api/v1/apainment/:id', async (req, res) => {
  try {
    const id = req.params.id
    const filter = { _id: new ObjectId(id) }
    const updateDoc = {
      $set: {
        available_room: 'false'
      }
    }
    const result = await apartmentCollection.updateOne(filter, updateDoc)
    res.send(result)
  } catch (error) {
    console.log(error);
  }
})

app.get('/api/v1/apainment', async (req, res) => {
  try {
   
    let queryObj = {}
    const page = Number(req.query.page)
    const limit = Number(req.query.limit)
    const skip = (page - 1) * limit

    const available_room = req.query.available_room;
    if (available_room) {
      queryObj.available_room = available_room;
    }

    const cursor = apartmentCollection.find(queryObj).skip(skip).limit(limit)
    const result = await cursor.toArray()
    const total = await apartmentCollection.countDocuments()
    res.send({
      total,
      result
    })
  } catch (error) {
    console.log(error);
  }

})


//payment related api 
app.post('/api/v1/create-payment-intent', async (req, res) => {
  try {
    const { price } = req.body;
    console.log(price);
    const amount = parseInt(price * 100);
    console.log(amount);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      payment_method_types: ['card']
    });
    console.log(paymentIntent);
    res.send({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error creating PaymentIntent' });
  }
});


app.post('/api/v1/payments', async (req, res) => {
  try {
    const payment = req.body;
    const paymentResult = await paymentCollection.insertOne(payment);
    const query = {
      _id: {
        $in: payment.bookingIds.map(id => new ObjectId(id))
      }
    };
    const deleteResult = await bookingCollection.deleteMany(query);
    res.send({ paymentResult, deleteResult });
  } catch (error) {
    console.log(error);
  }
})

app.get('/api/v1/payments', async (req, res) => {
  const query = { email: req.query.email }
  console.log(query);
  if (req.params.eamil !== req.params.email) {
    return res.status(403).send({ message: 'forbidden access' })
  }
  const result = await paymentCollection.find(query).toArray()
  res.send(result)
  console.log(result);
})


// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     // await client.connect();
//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     // await client.close();
//   }
// }
// run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Dreem House server is running')
})
app.listen(port, () => {
  console.log(`server is runnign ${port}`);
})  