const notFound = (req, res) => {
  res.status(404).json({ error: 'Not found' });
};
const errorHandler = (err, _req, res, _next) => {
  res.status(500).json({ error: err.message || 'Server error' });
};
module.exports = { notFound, errorHandler };
