const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



app.use(cors({
  origin: ['https://bite-bliss-5f00e.web.app', 'http://localhost:5173'],
  credentials: true
}))
require('dotenv').config(); 
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.tpodeld.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const userCollaction = client.db('BiteBlissDB').collection('BBUsers');
const foodCollaction = client.db('BiteBlissDB').collection('DefaultFood');
const ordarsCollaction = client.db('BiteBlissDB').collection('Ordars');
const blogsCollaction = client.db('BiteBlissDB').collection('Blogs');


const logger = (req, res, next) => {
  console.log('log: info', req.method, req.url);
  next();
}
const varifyToken = (req, res, next) => {
  const token = req?.cookies?.token;

  if(!token){
    return res.status(401).send({message: 'unauthorized access'});
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if(error){
      return res.status(401).send({message: 'unauthorized access'})
    }
    req.user = decoded;
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    // ----------------------------------
    //       Auth related api
    // ----------------------------------


    app.post('/jwt', async(req, res) => {
      const user = req.body;
      console.log(user);
      console.log(req.token);
      const token = jwt.sign( user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '2h'});

      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', 
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send(token)
    })


    // ----------------------------------
    //       Serves related api
    // ----------------------------------

    // get 6 food for home page hero section 
    app.get('/getHomePageProduct', logger, async( req, res ) => {
      const products = foodCollaction.find().limit(6);
      const result = await products.toArray();
      console.log('token token token', req?.cookies?.token);
      res.send(result)
    })

    // get all food for All Foood page
    app.get('/getAllFood',  async(req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const foods = await foodCollaction.find().skip(page * size).limit(size).toArray();
      res.send(foods)
    })

    app.get('/getCount', async(req, res) => {
      const count = await foodCollaction.estimatedDocumentCount();
      res.send({count})
    })

    // get food by id for details
    app.get('/getFoodById/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}

      const result = await foodCollaction.findOne(query);
      res.send(result)
    })

    // get my food by email
    app.get('/getMyFoods/:email', varifyToken, async(req, res) => {
      const email = req.params.email;
      const query = { userEmail: email}

      const result = await foodCollaction.find(query).toArray();
      res.send(result)
    })

    // get Blog for blog page
    app.get( '/getBlogs', async( req, res) => {
      const blogs = await blogsCollaction.find().toArray();
      res.send(blogs)
    })

    // this api for get user orders adta
    app.get( '/getMyOrders/:email', varifyToken, async(req, res) => {
      const email = req.params.email;
      const query = { userEmal: email}
      const result = await ordarsCollaction.find(query).toArray();
      console.log(result);
      res.send(result);
    })
    
    // add new User data with name and user photo in database
    app.post('/addUsers', async(req, res) => {
      const newUser = req.body;
      console.log(newUser);

      const result = await userCollaction.insertOne(newUser);
      res.send(result)
    })

    // new food add by user
    app.post('/addFoodByUser', async(req, res) => {
      const newFood = req.body;

      const result = await foodCollaction.insertOne(newFood);
      console.log(newFood);
      res.send(result)
    })

    // on this api uoloade order data on databse 
    app.post( '/postOrdarsInfo', async(req, res) => {
      const oredr = req.body;
      const result = await ordarsCollaction.insertOne(oredr);
      res.send(result);
    })

    // this api make for user date update 
    app.put('/updateFod/:id', async( req, res ) => {
      const id = req.params.id;
      const updatedFood = req.body;
      const query = { _id: new ObjectId(id)};
      const options = { upsert: true};
      const food = {
        $set:{
          form: updatedFood.form,
          foodName: updatedFood.foodName,
          foodCategory: updatedFood.foodCategory,
          offer: updatedFood.offer,
          previousPrice: updatedFood.previousPrice,
          resturantName: updatedFood.resturantName,
          foodImage: updatedFood.foodImage,
          quantity: updatedFood.quantity,
          currentPrice: updatedFood.currentPrice,
          userEmail: updatedFood.userEmail
        }
      }

      const result = await foodCollaction.updateOne(query, food, options)
      console.log(result);
      res.send(result)
    })

    app.patch('/countQuantitey', async(req, res) => {
      console.log('pik quantitey');
    })

    // thi api for delet food by user
    app.delete( '/deletFood/:id', async( req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result = await foodCollaction.deleteOne(query);

      res.send(result)
    })

    app.delete( '/deletOrder/:id', async( req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result = await ordarsCollaction.deleteOne(query);

      res.send(result)
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Bite Bliss server is running')
})
app.listen( port, () => {
    console.log(`server running ${port} on port`);
})