const axios = require('axios');

module.exports = async (req, res) => {
  const { locale, items, endpoint } = req.body;

  const { data } = await axios.post(endpoint, {
    locale,
    items,
  });

  res.json(data);
};
