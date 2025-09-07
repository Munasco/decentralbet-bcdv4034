"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WalletConnect } from '../../components/WalletConnect';
import { useAccount } from 'wagmi';
import { useCreateMarket } from '../../hooks/usePredictionMarket';
import { toast } from 'react-hot-toast';

const categories = ['Politics', 'Sports', 'Technology', 'Crypto', 'Economics', 'Entertainment', 'Science', 'Other'];

export default function CreateMarket() {
  const router = useRouter();
  const { isConnected } = useAccount();
  
  const { createMarket, isLoading } = useCreateMarket(() => {
    // Success callback: reload and navigate to home
    router.push('/')
  });

  const [formData, setFormData] = useState({
    question: '',
    category: 'Politics',
    description: '',
    endDate: '',
    endTime: '',
    outcomes: ['Yes', 'No'],
    feePercentage: 2
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.question.trim()) {
      newErrors.question = 'Question is required';
    } else if (formData.question.length < 10) {
      newErrors.question = 'Question must be at least 10 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else {
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime || '23:59'}`);
      const now = new Date();
      const minDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      if (endDateTime <= minDate) {
        newErrors.endDate = 'Market must end at least 24 hours from now';
      }
    }

    if (formData.outcomes.length < 2) {
      newErrors.outcomes = 'At least 2 outcomes are required';
    }

    if (formData.outcomes.some(outcome => !outcome.trim())) {
      newErrors.outcomes = 'All outcomes must have a description';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    const endDateTime = new Date(`${formData.endDate}T${formData.endTime || '23:59'}`);

    createMarket({
      question: formData.question,
      category: formData.category,
      description: formData.description,
      endTime: endDateTime,
      outcomes: formData.outcomes.filter(o => o.trim()),
      feePercentage: formData.feePercentage
    });
  };

  const addOutcome = () => {
    setFormData(prev => ({
      ...prev,
      outcomes: [...prev.outcomes, '']
    }));
  };

  const removeOutcome = (index: number) => {
    if (formData.outcomes.length > 2) {
      setFormData(prev => ({
        ...prev,
        outcomes: prev.outcomes.filter((_, i) => i !== index)
      }));
    }
  };

  const updateOutcome = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      outcomes: prev.outcomes.map((outcome, i) => i === index ? value : outcome)
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/')}
                className="text-2xl font-bold text-purple-600 hover:text-purple-700"
              >
                DecentralBet
              </button>
              <span className="ml-2 text-sm text-gray-500">Create Market</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Markets
              </button>
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Prediction Market</h1>
            <p className="text-gray-600">
              Create a new market for others to predict on. Make sure to provide clear, unambiguous questions.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Question */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Market Question *
              </label>
              <input
                type="text"
                value={formData.question}
                onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                  errors.question ? 'border-error' : 'border-gray-300'
                }`}
                placeholder="e.g., Will Bitcoin reach $100,000 by the end of 2025?"
              />
              {errors.question && <p className="text-error text-sm mt-1">{errors.question}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                  errors.description ? 'border-error' : 'border-gray-300'
                }`}
                placeholder="Provide detailed information about the market, including resolution criteria..."
              />
              {errors.description && <p className="text-error text-sm mt-1">{errors.description}</p>}
            </div>

            {/* End Date/Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                    errors.endDate ? 'border-error' : 'border-gray-300'
                  }`}
                />
                {errors.endDate && <p className="text-error text-sm mt-1">{errors.endDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
                />
              </div>
            </div>

            {/* Outcomes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Possible Outcomes *
              </label>
              <div className="space-y-2">
                {formData.outcomes.map((outcome, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={outcome}
                      onChange={(e) => updateOutcome(index, e.target.value)}
                      placeholder={`Outcome ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
                    />
                    {formData.outcomes.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOutcome(index)}
                        className="px-3 py-2 bg-error-muted text-error rounded-lg hover:bg-error-muted/80"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {errors.outcomes && <p className="text-error text-sm mt-1">{errors.outcomes}</p>}
              
              {formData.outcomes.length < 6 && (
                <button
                  type="button"
                  onClick={addOutcome}
                  className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  + Add Outcome
                </button>
              )}
            </div>

            {/* Fee Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Market Fee (%)
              </label>
              <select
                value={formData.feePercentage}
                onChange={(e) => setFormData(prev => ({ ...prev, feePercentage: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
              >
                <option value={1}>1% - Low fee</option>
                <option value={2}>2% - Standard fee</option>
                <option value={3}>3% - High fee</option>
                <option value={5}>5% - Premium fee</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                This fee is deducted from the total prize pool when the market resolves.
              </p>
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isConnected || isLoading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating Market...' : 'Create Market'}
              </button>
            </div>

            {!isConnected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-center">
                  Please connect your wallet to create a prediction market.
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
