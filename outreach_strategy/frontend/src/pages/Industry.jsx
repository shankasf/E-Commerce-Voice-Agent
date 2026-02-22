import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Zap, ShoppingCart, Megaphone, ChevronRight, Users, Target } from 'lucide-react';

export default function Industry() {
  const { id } = useParams();
  const [industry, setIndustry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/gtm/industries/${id}`)
      .then(res => setIndustry(res.data.industry))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!industry) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Industry not found</h2>
        <Link to="/" className="text-blue-600 hover:underline mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft size={20} className="mr-2" />
          Back to Dashboard
        </Link>
        <div className={`bg-gradient-to-r ${industry.color} rounded-2xl p-8 text-white`}>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{industry.icon}</span>
            <h1 className="text-3xl font-bold">{industry.name}</h1>
          </div>
        </div>
      </div>

      {/* Why Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 p-2 rounded-lg">
              <Zap className="text-red-600" size={20} />
            </div>
            <h3 className="font-semibold text-gray-900">Why Urgent</h3>
          </div>
          <p className="text-gray-600">{industry.whyUrgent}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-2 rounded-lg">
              <ShoppingCart className="text-green-600" size={20} />
            </div>
            <h3 className="font-semibold text-gray-900">Why They Buy Fast</h3>
          </div>
          <p className="text-gray-600">{industry.whyBuyFast}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Megaphone className="text-blue-600" size={20} />
            </div>
            <h3 className="font-semibold text-gray-900">Why Outbound Works</h3>
          </div>
          <p className="text-gray-600">{industry.whyOutboundWorks}</p>
        </div>
      </div>

      {/* Markets */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Target Markets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {industry.markets.map((market) => (
            <div key={market.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <Target className="text-blue-600" size={24} />
                <h3 className="text-lg font-semibold text-gray-900">{market.name}</h3>
              </div>
              <p className="text-gray-600">{market.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Segments */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Buyer Segments</h2>
        <div className="space-y-4">
          {industry.segments.map((segment) => {
            const market = industry.markets.find(m => m.id === segment.marketId);
            return (
              <Link
                key={segment.id}
                to={`/segment/${segment.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <Users className="text-purple-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
                        {segment.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Market: {market?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-sm text-gray-500">Titles</p>
                      <p className="font-medium text-gray-900">
                        {segment.buyerPersona.titles.slice(0, 2).join(', ')}
                        {segment.buyerPersona.titles.length > 2 && '...'}
                      </p>
                    </div>
                    <ChevronRight className="text-gray-400 group-hover:text-blue-600" size={24} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
