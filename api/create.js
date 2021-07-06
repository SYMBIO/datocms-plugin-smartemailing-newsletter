const axios = require('axios');

module.exports = async (req, res) => {
  const { locale, items, endpoint } = req.body;

  console.log(locale, items, endpoint);

  const { data } = await axios.post(endpoint, {
    locale,
    items,
  });

  console.log(data);

  res.json(data);
};
