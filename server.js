require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'echoverse-super-secret-key';

// ─── MONGODB MODELS ─────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  password: { type: String, select: false },
  avatar: String,
  bio: { type: String, default: "" },
  interests: [String],
  badges: [String],
  joined: String,
  followers: { type: Number, default: 0 },
  following: { type: Number, default: 0 }
});

const postSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  slug: String,
  content: String,
  excerpt: String,
  mood: String,
  moodColor: String,
  tags: [String],
  category: String,
  coverGradient: String,
  readTime: Number,
  published: Boolean,
  anonymous: Boolean,
  draft: Boolean,
  createdAt: { type: Date, default: Date.now },
  reactions: {
    Inspired: { type: Number, default: 0 },
    Curious: { type: Number, default: 0 },
    Emotional: { type: Number, default: 0 },
    Helpful: { type: Number, default: 0 },
    Powerful: { type: Number, default: 0 }
  },
  views: { type: Number, default: 0 },
  bookmarks: { type: Number, default: 0 }
});

const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  authorId: { type: mongoose.Schema.Types.Mixed }, // String for 'anon', ObjectId for users
  content: String,
  createdAt: { type: Date, default: Date.now },
  reactions: { type: Number, default: 0 },
  replies: [{
    authorId: String,
    content: String,
    createdAt: { type: Date, default: Date.now },
    reactions: { type: Number, default: 0 }
  }]
});

const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);
const Comment = mongoose.model('Comment', commentSchema);

// ─── AUTH MIDDLEWARE ────────────────────────────────────────────────────────

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ─── ROUTES ─────────────────────────────────────────────────────────────────

// Auth & Users
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = name.split(" ").map(n => n[0]).join("").toUpperCase();
    
    const user = new User({
      name, username, email, password: hashedPassword, avatar,
      badges: ["New Voice"], joined: new Date().toISOString().split("T")[0]
    });
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
    const userObj = user.toObject();
    delete userObj.password;
    res.json({ token, user: userObj });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
    const userObj = user.toObject();
    delete userObj.password;
    res.json({ token, user: userObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.userId, req.body, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Posts
app.get('/api/posts', async (req, res) => {
  try {
    const { category, tag, authorId, search } = req.query;
    let query = { published: true, draft: false };
    
    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (authorId) query.authorId = authorId;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [{ title: searchRegex }, { content: searchRegex }, { tags: searchRegex }];
    }

    const posts = await Post.find(query).sort({ createdAt: -1 }).populate('authorId', 'name username avatar badges');
    
    // Format to match frontend structure and attach comment counts
    const formattedPosts = await Promise.all(posts.map(async p => {
      const post = p.toObject();
      post.id = post._id;
      post.author = post.anonymous ? 
        { name: "Anonymous Voice", avatar: "?", username: "anon", badges: [] } : 
        { ...post.authorId, id: post.authorId._id };
      delete post.authorId;
      post.commentCount = await Comment.countDocuments({ postId: post.id });
      return post;
    }));
    
    res.json(formattedPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true })
                           .populate('authorId', 'name username avatar badges bio followers');
    if (!post) return res.status(404).json({ error: 'Not found' });
    
    const formattedPost = post.toObject();
    formattedPost.id = formattedPost._id;
    formattedPost.author = formattedPost.anonymous ? 
      { name: "Anonymous Voice", avatar: "?", username: "anon" } : 
      { ...formattedPost.authorId, id: formattedPost.authorId._id };
    
    res.json(formattedPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts', authenticate, async (req, res) => {
  try {
    const post = new Post({ ...req.body, authorId: req.userId });
    await post.save();
    res.json({ ...post.toObject(), id: post._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/posts/:id', authenticate, async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, authorId: req.userId },
      req.body,
      { new: true }
    );
    res.json({ ...post.toObject(), id: post._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/posts/:id', authenticate, async (req, res) => {
  try {
    await Post.findOneAndDelete({ _id: req.params.id, authorId: req.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/:id/react', async (req, res) => {
  try {
    const { reaction } = req.body;
    const post = await Post.findById(req.params.id);
    post.reactions[reaction] = (post.reactions[reaction] || 0) + 1;
    await post.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Comments
app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId }).populate('authorId', 'name avatar username');
    const formatted = await Promise.all(comments.map(async c => {
      const comment = c.toObject();
      comment.id = comment._id;
      comment.author = typeof comment.authorId === 'object' && comment.authorId !== null 
        ? comment.authorId 
        : { name: "Anonymous", avatar: "?", username: "anon" };
        
      // Hydrate reply authors
      comment.replies = await Promise.all(comment.replies.map(async r => {
        if (r.authorId === "anon" || r.authorId.startsWith("anon_")) return { ...r, author: { name: "Anonymous", avatar: "?", username: "anon" }};
        const u = await User.findById(r.authorId);
        return { ...r, author: u ? { name: u.name, avatar: u.avatar, username: u.username } : { name: "User", avatar: "?" } };
      }));
        
      return comment;
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/:postId/comments', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    let authorId = "anon_" + Date.now();
    let authorData = { name: "Anonymous", avatar: "?", username: "anon" };
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        authorId = decoded.userId;
        const user = await User.findById(authorId);
        if (user) authorData = { name: user.name, avatar: user.avatar, username: user.username };
      } catch (e) {}
    }

    const comment = new Comment({ postId: req.params.postId, authorId, content: req.body.content });
    await comment.save();
    res.json({ ...comment.toObject(), id: comment._id, author: authorData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/comments/:commentId/reply', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    let authorId = "anon_" + Date.now();
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        authorId = decoded.userId;
      } catch (e) {}
    }

    const comment = await Comment.findById(req.params.commentId);
    comment.replies.push({ authorId, content: req.body.content });
    await comment.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/echoverse')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(3001, () => console.log('Server running on port 3001'));
  })
  .catch(err => console.error('MongoDB connection error:', err));