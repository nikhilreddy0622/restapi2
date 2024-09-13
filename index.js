const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const Task = require('./models/Task');
require('dotenv').config(); // Add this line at the top

const app = express();
const port = process.env.PORT || 8080;

// Connect to MongoDB
mongoose.connect(process.env.ATLASDB_URL, { // Use the URI from environment variables
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Session Store
const sessionStore = MongoStore.create({
    mongoUrl: process.env.ATLASDB_URL,
    collectionName: 'sessions',
    crypto: {
        secret: process.env.SESSION_SECRET // Add a session secret for encryption
    }
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));
mongoose.set('strictQuery',true);
// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/task', async (req, res) => {
    const filter = req.query.filter || 'all';
    try {
        let tasks;
        const totalTasks = await Task.countDocuments();

        if (filter === 'completed') {
            tasks = await Task.find({ completed: true });
        } else if (filter === 'remaining') {
            tasks = await Task.find({ completed: false });
        } else {
            tasks = await Task.find();
        }

        res.render('home', { tasks, filter, totalTasks });
    } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).json({ error: 'Error fetching tasks', details: err.message });
    }
});

// New Task form
app.get('/task/new', (req, res) => {
    res.render('new');
});

// Add New Task
app.post('/task/add', async (req, res) => {
    const { description } = req.body;
    try {
        await new Task({ description }).save();
        res.redirect('/task');
    } catch (err) {
        console.error('Error adding task:', err);
        res.status(500).json({ error: 'Error adding task', details: err.message });
    }
});

// Edit Task form
app.get('/task/edit/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const task = await Task.findById(id);
        if (task) {
            res.render('edit', { task });
        } else {
            res.redirect('/task');
        }
    } catch (err) {
        console.error('Error fetching task:', err);
        res.status(500).json({ error: 'Error fetching task', details: err.message });
    }
});

// Update Task
app.post('/task/update', async (req, res) => {
    const { id, description } = req.body;
    try {
        await Task.findByIdAndUpdate(id, { description });
        res.redirect('/task');
    } catch (err) {
        console.error('Error updating task:', err);
        res.status(500).json({ error: 'Error updating task', details: err.message });
    }
});

// Delete Task
app.post('/task/delete', async (req, res) => {
    const { id } = req.body;
    try {
        await Task.findByIdAndDelete(id);
        res.redirect('/task');
    } catch (err) {
        console.error('Error deleting task:', err);
        res.status(500).json({ error: 'Error deleting task', details: err.message });
    }
});

// Update Task Status
app.post('/task/update-status', async (req, res) => {
    const { id, completed } = req.body;
    try {
        await Task.findByIdAndUpdate(id, { completed: completed === 'on' });
        res.redirect('/task');
    } catch (err) {
        console.error('Error updating task status:', err);
        res.status(500).json({ error: 'Error updating task status', details: err.message });
    }
});

app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
});
