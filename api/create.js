const axios = require('axios');

module.exports = async (req, res) => {
  const { locale, items, endpoint } = req.body;

  try {
    const { data } = await axios.post(endpoint, {
      locale,
      items,
    }, {
      timeout: 10,
    });

    res.status(200).end(JSON.stringify(data));
  } catch (e) {
    console.error(e);
    res.status(500).end('timeout');
  }
};
