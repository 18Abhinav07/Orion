import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const AboutRwa: React.FC = () => {
  const features = [
    {
      title: "Tokenization",
      description: "Transform physical assets into digital tokens for fractional ownership and liquidity.",
      icon: "🔗"
    },
    {
      title: "Security",
      description: "Blockchain-backed security ensures transparency and immutability of all transactions.",
      icon: "🛡️"
    },
    {
      title: "Accessibility",
      description: "Democratize investment opportunities previously reserved for institutional investors.",
      icon: "🌍"
    }
  ];

  return (
    <div className="relative min-h-screen w-full bg-white py-24">
      <div className="mx-auto w-full max-w-7xl px-4">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 bg-gray-100 text-gray-800 border border-gray-200">
            Real-World Assets
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            Bridging Traditional Finance & Blockchain
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            We tokenize high-quality physical and financial assets to provide secure, transparent
            investment opportunities to a broader audience.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="shadow-sm border border-gray-100 bg-white rounded-lg p-6">
              <CardHeader className="text-center pb-2">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <CardTitle className="text-xl text-gray-900">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-4 bg-gray-50 rounded-full px-6 py-3 border border-gray-100 shadow-sm">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-full border-2 border-white"></div>
              <div className="w-8 h-8 bg-emerald-500 rounded-full border-2 border-white"></div>
              <div className="w-8 h-8 bg-pink-500 rounded-full border-2 border-white"></div>
            </div>
            <span className="text-gray-800 font-medium">Trusted by investors globally</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutRwa;
