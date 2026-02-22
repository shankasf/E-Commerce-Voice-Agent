import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Building2, Users, Target, TrendingUp, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const [product, setProduct] = useState(null);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/gtm/product'),
      api.get('/gtm/industries'),
    ]).then(([productRes, industriesRes]) => {
      setProduct(productRes.data.product);
      setIndustries(industriesRes.data.industries);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Product Overview */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{product?.name}</h1>
            <p className="text-blue-100 mt-1">{product?.tagline}</p>
          </div>
          <span className="bg-white/20 px-4 py-2 rounded-full text-sm font-medium">
            {product?.summary}
          </span>
        </div>
        <p className="mt-6 text-lg text-blue-50">{product?.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white/10 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Target className="text-blue-200" size={24} />
              <h3 className="font-semibold text-lg">Primary Value</h3>
            </div>
            <p className="text-blue-100">{product?.primaryValue}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="text-blue-200" size={24} />
              <h3 className="font-semibold text-lg">Sales Motion</h3>
            </div>
            <p className="text-blue-100">{product?.salesMotion}</p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="font-semibold text-lg mb-3">Best Customers</h3>
          <div className="flex flex-wrap gap-3">
            {product?.bestCustomers?.map((customer, i) => (
              <span key={i} className="bg-white/20 px-4 py-2 rounded-full text-sm">
                {customer.name} <span className="text-blue-200">({customer.industry})</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Building2 className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{industries.length}</p>
              <p className="text-gray-600 text-sm">Industries</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Target className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {industries.reduce((acc, i) => acc + i.marketsCount, 0)}
              </p>
              <p className="text-gray-600 text-sm">Markets</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {industries.reduce((acc, i) => acc + i.segmentsCount, 0)}
              </p>
              <p className="text-gray-600 text-sm">Segments</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-3 rounded-lg">
              <TrendingUp className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">Apollo</p>
              <p className="text-gray-600 text-sm">Ready Filters</p>
            </div>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Target Industries</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {industries.map((industry) => (
            <Link
              key={industry.id}
              to={`/industry/${industry.id}`}
              className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition"
            >
              <div className={`h-2 bg-gradient-to-r ${industry.color}`}></div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{industry.icon}</span>
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition">
                    {industry.name}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm line-clamp-2 mb-4">{industry.whyUrgent}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>{industry.marketsCount} markets</span>
                    <span>{industry.segmentsCount} segments</span>
                  </div>
                  <ChevronRight className="text-gray-400 group-hover:text-blue-600 transition" size={20} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
