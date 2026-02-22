import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowLeft, Users, AlertTriangle, DollarSign, Zap,
  Filter, MessageCircle, XCircle, CheckCircle, Briefcase,
  Building2, MapPin, Coins, Cpu
} from 'lucide-react';

export default function Segment() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/gtm/segments/${id}`)
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Segment not found</h2>
        <Link to="/" className="text-blue-600 hover:underline mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { segment, market, industry } = data;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div>
        <Link
          to={`/industry/${industry.id}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to {industry.name}
        </Link>
        <div className={`bg-gradient-to-r ${industry.color} rounded-2xl p-8 text-white`}>
          <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <span>{industry.icon}</span>
            <span>{industry.name}</span>
            <span>/</span>
            <span>{market.name}</span>
          </div>
          <h1 className="text-3xl font-bold">{segment.name}</h1>
        </div>
      </div>

      {/* Buyer Persona */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Users className="text-purple-600" size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Buyer Persona</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Titles</p>
            <div className="flex flex-wrap gap-2">
              {segment.buyerPersona.titles.map((title, i) => (
                <span key={i} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                  {title}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Seniority</p>
            <p className="font-medium text-gray-900">{segment.buyerPersona.seniority}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Department</p>
            <p className="font-medium text-gray-900">{segment.buyerPersona.department}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Reports To</p>
            <p className="font-medium text-gray-900">{segment.buyerPersona.reportsTo}</p>
          </div>
        </div>
      </section>

      {/* Pain Profile */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-red-100 p-2 rounded-lg">
            <AlertTriangle className="text-red-600" size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Pain Profile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-red-50 rounded-lg p-5">
            <h3 className="font-semibold text-red-900 mb-2">What's Broken</h3>
            <p className="text-red-800">{segment.painProfile.whatsBroken}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-5">
            <h3 className="font-semibold text-orange-900 mb-2">Cost of Doing Nothing</h3>
            <p className="text-orange-800">{segment.painProfile.costOfDoingNothing}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-2">What They've Tried</h3>
            <ul className="space-y-1">
              {segment.painProfile.whatTheyTried.map((item, i) => (
                <li key={i} className="text-gray-600 flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-green-50 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-green-600" size={20} />
              <h3 className="font-semibold text-green-900">Cost Impact</h3>
            </div>
            <p className="text-green-800">{segment.painProfile.cost}</p>
          </div>
        </div>
      </section>

      {/* Urgency Triggers */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-yellow-100 p-2 rounded-lg">
            <Zap className="text-yellow-600" size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Urgency Triggers</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {segment.urgencyTriggers.map((trigger, i) => (
            <div key={i} className="flex items-center gap-3 bg-yellow-50 rounded-lg p-4">
              <div className="bg-yellow-200 p-1 rounded-full">
                <Zap className="text-yellow-700" size={16} />
              </div>
              <span className="text-yellow-900">{trigger}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Apollo Filters */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Filter className="text-blue-600" size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Apollo Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Building2 size={16} />
                Industry
              </div>
              <p className="font-medium text-gray-900">{segment.apolloFilters.industry}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Users size={16} />
                Company Size
              </div>
              <p className="font-medium text-gray-900">{segment.apolloFilters.companySize}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <MapPin size={16} />
                Geography
              </div>
              <p className="font-medium text-gray-900">{segment.apolloFilters.geography}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Coins size={16} />
                Funding
              </div>
              <p className="font-medium text-gray-900">{segment.apolloFilters.funding}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Briefcase size={16} />
                Titles
              </div>
              <div className="flex flex-wrap gap-1">
                {segment.apolloFilters.titles.map((title, i) => (
                  <span key={i} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                    {title}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Cpu size={16} />
                Tech Stack
              </div>
              <div className="flex flex-wrap gap-1">
                {segment.apolloFilters.techStack.map((tech, i) => (
                  <span key={i} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <div className="text-sm text-gray-500 mb-2">Keywords</div>
          <div className="flex flex-wrap gap-2">
            {segment.apolloFilters.keywords.map((kw, i) => (
              <span key={i} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
                {kw}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Message Fit */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-green-100 p-2 rounded-lg">
            <MessageCircle className="text-green-600" size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Message Fit</h2>
        </div>
        <div className="space-y-6">
          <div className="bg-green-50 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="text-green-600" size={20} />
              <h3 className="font-semibold text-green-900">Why One Email Works</h3>
            </div>
            <p className="text-green-800">{segment.messageFit.whyOneEmailWorks}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="text-blue-600" size={20} />
              <h3 className="font-semibold text-blue-900">Belief to Align With</h3>
            </div>
            <p className="text-blue-800">{segment.messageFit.beliefToAlignWith}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="text-red-600" size={20} />
              <h3 className="font-semibold text-red-900">Do NOT Say This</h3>
            </div>
            <p className="text-red-800">{segment.messageFit.doNotSay}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
