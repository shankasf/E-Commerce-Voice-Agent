import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { productContext, industries } from '../data/gtm-data.js';

const router = Router();

// Get product context
router.get('/product', authenticateToken, (req, res) => {
  res.json({ product: productContext });
});

// Get all industries (summary)
router.get('/industries', authenticateToken, (req, res) => {
  const summary = industries.map(industry => ({
    id: industry.id,
    name: industry.name,
    icon: industry.icon,
    color: industry.color,
    whyUrgent: industry.whyUrgent,
    marketsCount: industry.markets.length,
    segmentsCount: industry.segments.length,
  }));
  res.json({ industries: summary });
});

// Get single industry with full details
router.get('/industries/:id', authenticateToken, (req, res) => {
  const industry = industries.find(i => i.id === req.params.id);

  if (!industry) {
    return res.status(404).json({ error: 'Industry not found' });
  }

  res.json({ industry });
});

// Get segment by ID
router.get('/segments/:id', authenticateToken, (req, res) => {
  for (const industry of industries) {
    const segment = industry.segments.find(s => s.id === req.params.id);
    if (segment) {
      const market = industry.markets.find(m => m.id === segment.marketId);
      return res.json({
        segment,
        market,
        industry: {
          id: industry.id,
          name: industry.name,
          icon: industry.icon,
          color: industry.color,
        }
      });
    }
  }

  res.status(404).json({ error: 'Segment not found' });
});

// Search across all data
router.get('/search', authenticateToken, (req, res) => {
  const query = (req.query.q || '').toLowerCase();

  if (!query) {
    return res.json({ results: [] });
  }

  const results = [];

  industries.forEach(industry => {
    // Search in industry name and description
    if (industry.name.toLowerCase().includes(query) ||
        industry.whyUrgent.toLowerCase().includes(query)) {
      results.push({
        type: 'industry',
        id: industry.id,
        name: industry.name,
        icon: industry.icon,
        match: industry.name,
      });
    }

    // Search in segments
    industry.segments.forEach(segment => {
      const searchableText = [
        segment.name,
        ...segment.buyerPersona.titles,
        segment.painProfile.whatsBroken,
        segment.painProfile.cost,
        ...segment.urgencyTriggers,
        ...segment.apolloFilters.keywords,
      ].join(' ').toLowerCase();

      if (searchableText.includes(query)) {
        results.push({
          type: 'segment',
          id: segment.id,
          name: segment.name,
          industryId: industry.id,
          industryName: industry.name,
          icon: industry.icon,
        });
      }
    });
  });

  res.json({ results: results.slice(0, 20) });
});

export default router;
