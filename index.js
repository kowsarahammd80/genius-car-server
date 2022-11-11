const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
let app = express();
let port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.SECRET_USER}@cluster0.df9nipl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next){
   const authHeader = req.headers.authorization;
   if(!authHeader){
      return res.status(401).send({message: 'unauthorized access'});
   }
   const token = authHeader.split(' ')[1];
   jwt.verify(token, process.env.ACCESS_TOKEN_SCRET, function(err, decoded) {

      if(err){
         return res.status(401).send({message: 'unauthorized access'});
      }
      req.decoded = decoded;
      next();
      
   })
}


async function run () {

   try{

      let serviceCollection = client.db('geniusCar').collection('services');
      let OrderCollection = client.db('geniusCar').collection('orders');

      app.post('/jwt', (req, res) => {
         const user = req.body;
         const token = jwt.sign(user, process.env.ACCESS_TOKEN_SCRET,{ expiresIn: '1h'})
         res.send({token})
      })

      app.get('/services', async (req, res) => {
         const search = req.query.search;
         console.log(search);
         let  query = {};
         if(search.length){
            query ={
               $text : {
                  $search: search
               }
            }
         }
      //   const query = { price: {$gt: 100, $lt: 300} }
      //   const query = { price: {$eq: 200,} }
      //   const query = { price: {$in: [20, 30, 150]} }
      //   const query = { price: {$nin: [20, 30, 150]} }
      // const query = {$and: [{price: {$gt: 20}}, {price: {$gt: 100}}]}
        const order = req.query.order === 'asc' ? 1 : -1;
        const curcsor = serviceCollection.find(query).sort({price: order});
        const services = await curcsor.toArray();
        res.send(services);

      });

      app.get('/services/:id', async(req, res) => {
         const id = req.params.id;
         const query = {_id: ObjectId(id)};
         const service = await serviceCollection.findOne(query);
         res.send(service)
      });

      //orders api
      
      app.get('/orders',verifyJWT ,async(req,res) => {

         const decoded = req.decoded;
       
         if(decoded.email !== req.query.email){
            res.status(403).send({message: 'Forbidden access'})
         }

         let query = {};
         if(req.query.email){
            query={
               email: req.query.email
            }
         }
         let cursor = OrderCollection.find(query);
         let orders = await cursor.toArray();
         res.send(orders)
      })

      app.post('/orders', verifyJWT ,async(req, res) => {
         const order = req.body;
         const result = await OrderCollection.insertOne(order);
         console.log(result)
         res.send(result);
      });

      app.patch('/orders/:id', verifyJWT, async(req, res) => {
          const id = req.params.id;
          const status = req.body.status;
          const query = {_id: ObjectId(id)}
          const updatedDoc = {
            $set: {
               status: status
            } 
          }
          const result = await OrderCollection.updateOne(query, updatedDoc);
          res.send(result);
      })

      app.delete('/orders/:id', verifyJWT ,async(req, res) => {
         const id = req.params.id;
         const query = {_id: ObjectId(id)};
         const result = await OrderCollection.deleteOne(query);
         res.send(result);
      })

   }
   finally{
     
   }

}

run().catch(err => console.error(err))


app.get('/', (req, res) => {
  res.send('genius car server is running')
})

app.listen(port, () => {
  console.log(`Genius Car server runnig on ${port}`)
})