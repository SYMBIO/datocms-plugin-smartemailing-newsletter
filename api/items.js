const { SiteClient } = require('datocms-client');
const dotenv = require('dotenv');

dotenv.config();
const client = new SiteClient(process.env.DATOCMS_API_TOKEN);

async function getFilteredRecords(from, to, locale) {
  const promise1 = client.items.all({
    filter: {
      type: 'news',
      fields: {
        date_from: {
          gt: from,
          lt: to,
        },
      },
    },
    version: 'published',
  });
  const promise2 = client.items.all({
    filter: {
      type: 'insight',
      fields: {
        _first_published_at: {
          gt: from,
          lt: to,
        },
      },
    },
    version: 'published',
  });

  const [news, insights] = await Promise.all([promise1, promise2]);

  return news.filter((n) => n.title[locale]).map((n) => ({
    id: n.id,
    date: n.date_from,
    title: n.title,
  })).concat(insights.filter((i) => i.title[locale]).map((i) => ({
    id: i.id,
    date: i.first_published_at,
    title: i.title,
  })));
}

module.exports = async (req, res) => {
  const { from, to, locale } = req.query;

  const records = await getFilteredRecords(from, to, locale);

  res.json(records);
};
