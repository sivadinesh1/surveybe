const logger = (req, res, next) => {
  console.log('inside middle ware');
  next();
};

module.exports = logger;