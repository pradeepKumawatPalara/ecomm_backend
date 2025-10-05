require('dotenv').config();
const express = require('express');
const server = express();
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const cookieParser = require('cookie-parser');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SERVER_KEY); // ✅ moved up

// Controllers & Routes
const { createProduct } = require('./controller/Product');
const productsRouter = require('./routes/Products');
const categoriesRouter = require('./routes/Categories');
const brandsRouter = require('./routes/Brands');
const usersRouter = require('./routes/Users');
const authRouter = require('./routes/Auth');
const cartRouter = require('./routes/Cart');
const ordersRouter = require('./routes/Order');

// Models & Services
const { User } = require('./model/User');
const { Order } = require('./model/Order');
const { isAuth, sanitizeUser, cookieExtractor } = require('./services/common');

// =========================
// STRIPE WEBHOOK
// =========================
const endpointSecret = process.env.ENDPOINT_SECRET;

server.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (request, response) => {
    const sig = request.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntentSucceeded = event.data.object;
        const order = await Order.findById(paymentIntentSucceeded.metadata.orderId);
        if (order) {
          order.paymentStatus = 'received';
          await order.save();
        }
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    response.status(200).send(); // ✅ ensure proper response
  }
);

// =========================
// JWT OPTIONS
// =========================
const opts = {
  jwtFromRequest: cookieExtractor, // ✅ uses token from cookies
  secretOrKey: process.env.JWT_SECRET_KEY,
};
const allowedOrigins = [process.env.FRONTEND_URL];

// =========================
// MIDDLEWARES
// =========================
server.use(express.static(path.resolve(__dirname, 'build')));
server.use(cookieParser());
server.use(express.json()); // ✅ must be before routes

server.use(
  cors({
    origin: function (origin, callback) {
      if (process.env.ENVIRONMENT === 'development') {
        return callback(null, true);
      }
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    exposedHeaders: ['X-Total-Count'],
  })
);

// =========================
// PASSPORT STRATEGIES
// =========================
passport.use(
  'local',
  new LocalStrategy({ usernameField: 'email' }, async function (email, password, done) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      crypto.pbkdf2(password, user.salt, 310000, 32, 'sha256', async function (err, hashedPassword) {
        if (err) return done(err);

        // ✅ Convert stored password to Buffer for safe comparison
        const storedPassword = Buffer.from(user.password, 'hex');
        if (!crypto.timingSafeEqual(storedPassword, hashedPassword)) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        // ✅ Generate JWT
        const token = jwt.sign(sanitizeUser(user), process.env.JWT_SECRET_KEY, { expiresIn: '10h' });
        done(null, { id: user.id, role: user.role, token });
      });
    } catch (err) {
      done(err);
    }
  })
);

passport.use(
  'jwt',
  new JwtStrategy(opts, async function (jwt_payload, done) {
    try {
      const user = await User.findById(jwt_payload.id);
      if (user) {
        return done(null, sanitizeUser(user));
      } else {
        return done(null, false);
      }
    } catch (err) {
      return done(err, false);
    }
  })
);

// ✅ Serialize/Deserialize (for potential session use, harmless if JWT-only)
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, { id: user.id, role: user.role });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

// Initialize Passport
server.use(passport.initialize());

// =========================
// ROUTES
// =========================
server.use('/products', isAuth(), productsRouter.router);
server.use('/categories', isAuth(), categoriesRouter.router);
server.use('/brands', isAuth(), brandsRouter.router);
server.use('/users', isAuth(), usersRouter.router);
server.use('/auth', authRouter.router);
server.use('/cart', isAuth(), cartRouter.router);
server.use('/orders', isAuth(), ordersRouter.router);

server.get('/', (req, res) => res.send('Server working'));

// React Router fallback
server.get('*', (req, res) => res.sendFile(path.resolve('build', 'index.html')));

// =========================
// STRIPE PAYMENT INTENT
// =========================
server.post('/create-payment-intent', async (req, res) => {
  const { totalAmount, orderId } = req.body;
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmount * 100,
    currency: 'inr',
    automatic_payment_methods: { enabled: true },
    metadata: { orderId },
  });

  res.send({ clientSecret: paymentIntent.client_secret });
});

// =========================
// DATABASE CONNECTION
// =========================
main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Database connected');
}

// =========================
// START SERVER
// =========================
server.listen(process.env.PORT, () => {
  console.log(`Server started on port ${process.env.PORT}`);
});
