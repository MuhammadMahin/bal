const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.leihwcz.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });




async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db('homeispro').collection('services');
    const bookingCollection = client.db('homeispro').collection('bookings');
    const userCollection = client.db('homeispro').collection('users');

    app.get('/service', async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    app.get('/user', async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.get('/admin/:email', async(req, res) =>{
      const email = req.params.email;
      const user = await userCollection.findOne({email: email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin})
    })

    app.put('/user/admin/:email', async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: 'admin' },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
      else{
        res.status(403).send({message: 'forbidden'});
      }

    })

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send({ result, token });
    })

    
    app.get('/available', async (req, res) => {
      const date = req.query.date;

      // step 1:  get all services
      const services = await serviceCollection.find().toArray();

    
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();

      // step 3: for each service
      services.forEach(service => {
      
        const serviceBookings = bookings.filter(book => book.treatment === service.name);
        // step 5: select slots for the service Bookings: ['', '', '', '']
        const bookedSlots = serviceBookings.map(book => book.slot);
        // step 6: select those slots that are not in bookedSlots
        const available = service.slots.filter(slot => !bookedSlots.includes(slot));
        //step 7: set available to slots to make it easier 
        service.slots = available;
      });


      res.send(services);
    })

   

    app.get('/booking', async (req, res) => {
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;
      if (patient === decodedEmail) {
        const query = { patient: patient };
        const bookings = await bookingCollection.find(query).toArray();
        return res.send(bookings);
      }
      else {
        return res.status(403).send({ message: 'forbidden access' });
      }
    })

    app.post('/booking', async (req, res) => {
      const booking = req.body;
      const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists })
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({ success: true, result });
    })

  }
  finally {

  }
}

run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello From Homeispro.com')
})

app.listen(port, () => {
  console.log(`Homeispro listening on port ${port}`)
})