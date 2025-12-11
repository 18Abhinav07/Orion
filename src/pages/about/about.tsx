"use client";
import React from "react";
import { motion } from "framer-motion";
import { LampContainer } from "../../components/ui/lamp";
import { FloatingNav } from "../../components/ui/floating-navbar";
import { IconHome, IconMessage, IconUser, IconShield, IconTrendingUp, IconGlobe, IconUsers, IconCoin, IconLock } from "@tabler/icons-react";

const About = () => {
  const navItems = [
    {
      name: "Home",
      link: "/",
      icon: <IconHome className="h-4 w-4 text-neutral-500 dark:text-white" />,
    },
    {
      name: "About",
      link: "/about",
      icon: <IconUser className="h-4 w-4 text-neutral-500 dark:text-white" />,
    },
    {
      name: "Tokenize",
      link: "/issuer",
      icon: <IconMessage className="h-4 w-4 text-neutral-500 dark:text-white" />,
    },
  ];

  return (
    <div className="min-h-screen bg-black">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto">
          <FloatingNav navItems={navItems} />
        </div>
      </nav>

      <div className="h-screen">
        <LampContainer className="h-screen">
          <motion.h1
            initial={{ opacity: 0.5, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.8,
              ease: "easeInOut",
            }}
            className="mt-40 text-center text-4xl font-light tracking-tight text-white md:text-6xl lg:text-7xl"
          >
          Open Assets
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-8 max-w-4xl text-center text-white/90"
          >
            <p className="text-xl md:text-2xl font-light leading-relaxed mb-6">
              Democratizing Premium Real-World Asset Investment Through Blockchain Technology
            </p>
            <p className="text-lg text-white/70 font-light leading-relaxed max-w-3xl mx-auto flex items-center justify-center gap-2">
  Built on <span className="text-white font-medium">Flow Network</span>
  <img
    src="flowscan-logo.svg" // <-- replace with your actual logo path
    alt="Flow Logo"
    className="h-6 w-auto inline-block"
  />
</p>

          </motion.div>
        </LampContainer>
      </div>

      {/* Mission Statement */}
      <div className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6">Our Mission</h2>
            <p className="text-xl text-gray-600 font-light leading-relaxed max-w-4xl mx-auto">
              To democratize access to premium real-world assets by creating the most secure, compliant, 
              and accessible tokenization platform, enabling anyone to invest in high-value assets 
              starting from just $10.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-20"
          >
            <div className="text-center">
              <div className="text-4xl font-light text-blue-600 mb-2">$280T</div>
              <div className="text-gray-600 font-light">Global RWA Market</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light text-blue-600 mb-2">$10</div>
              <div className="text-gray-600 font-light">Minimum Investment</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light text-blue-600 mb-2">2s</div>
              <div className="text-gray-600 font-light">Transaction Finality</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light text-blue-600 mb-2">24/7</div>
              <div className="text-gray-600 font-light">Global Trading</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Core Platform Features */}
      <div className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 text-center">Platform Overview</h2>
            <p className="text-xl text-gray-600 font-light text-center max-w-3xl mx-auto leading-relaxed mb-16">
              A comprehensive ecosystem for tokenizing, trading, and managing real-world assets 
              with institutional-grade security and retail accessibility.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
              >
                <IconShield className="w-12 h-12 text-blue-600 mb-6" />
                <h3 className="text-xl font-medium text-gray-900 mb-4">ERC-3643 Compliance</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  Regulatory-compliant tokenization with built-in KYC/AML protocols, identity registry, 
                  and automated transfer restrictions ensuring full regulatory compliance.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
              >
                <IconTrendingUp className="w-12 h-12 text-blue-600 mb-6" />
                <h3 className="text-xl font-medium text-gray-900 mb-4">Fractional Ownership</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  Own portions of premium assets like luxury real estate, commercial properties, 
                  and infrastructure projects with investments starting from $10.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
              >
                <IconGlobe className="w-12 h-12 text-blue-600 mb-6" />
                <h3 className="text-xl font-medium text-gray-900 mb-4">Global Marketplace</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  Access a diverse portfolio of tokenized assets from around the world, 
                  including real estate, commodities, art, and revenue-generating assets.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
              >
                <IconUsers className="w-12 h-12 text-blue-600 mb-6" />
                <h3 className="text-xl font-medium text-gray-900 mb-4">P2P Trading</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  Trade tokenized assets directly with other verified investors through our 
                  secure order book system with escrow-protected transactions.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
              >
                <IconCoin className="w-12 h-12 text-blue-600 mb-6" />
                <h3 className="text-xl font-medium text-gray-900 mb-4">Yield Distribution</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  Receive automated yield distributions from rental income, dividends, 
                  and asset appreciation directly to your wallet through smart contracts.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
              >
                <IconLock className="w-12 h-12 text-blue-600 mb-6" />
                <h3 className="text-xl font-medium text-gray-900 mb-4">Institutional Security</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  Multi-signature security, smart contract audits, insurance coverage, 
                  and regulatory oversight ensure maximum protection for your investments.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Flow Network Integration */}
      <div className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 text-center">
  Built on <span className="font-medium text-gray-900">Flow Network</span>
  <img
    src="/flowscan-logo.svg"
    alt="Flow Logo"
    className="h-12 w-auto inline align-middle ml-2"
  />
</h2>

            <p className="text-xl text-gray-600 font-light text-center max-w-3xl mx-auto leading-relaxed mb-16">
              Leveraging Flow Network's high-performance blockchain infrastructure for 
              seamless asset tokenization with instant finality and ultra-low fees.
            </p>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 md:p-12 mb-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-2xl font-medium text-gray-900 mb-6">Network Specifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-700 font-light">Chain ID: 39 (Flow Network)</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-700 font-light">Block Time: ~2 seconds</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-700 font-light">Transaction Finality: Instant</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-700 font-light">Gas Efficiency: Ultra-low fees</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-medium text-gray-900 mb-6">Integration Benefits</h3>
                  <div className="space-y-4 text-gray-700 font-light leading-relaxed">
                    <p>
                      All smart contracts including ERC-3643 compliant tokens, marketplace, 
                      order book escrow, and payment distribution systems are deployed 
                      directly on Flow Network.
                    </p>
                    <p>
                      The Flow integration enables cost-effective fractional ownership 
                      starting from $10, making the $280 trillion global real world assets 
                      market accessible to retail investors worldwide.
                    </p>
                    <p>
                      With instant finality, investors trade tokenized assets 24/7 
                      with confidence while automated yield distributions execute 
                      seamlessly through our smart contract infrastructure.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-gray-600 font-light mb-4">
                Discover more about the underlying blockchain technology
              </p>
              <a 
                href="https://flow.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-light rounded-lg hover:bg-blue-700 transition-colors"
              >
                Visit Flow Network
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 text-center">How It Works</h2>
            <p className="text-xl text-gray-600 font-light text-center max-w-3xl mx-auto leading-relaxed mb-16">
              Our streamlined process makes tokenizing and investing in real-world assets 
              simple, secure, and accessible to everyone.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-light text-blue-600">1</span>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-4">Asset Submission</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  Asset owners submit tokenization requests with comprehensive documentation, 
                  legal structure, and valuation reports.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-light text-blue-600">2</span>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-4">Due Diligence</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  Our team conducts thorough due diligence including legal review, 
                  asset valuation, and regulatory compliance verification.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-light text-blue-600">3</span>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-4">Token Creation</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  ERC-3643 compliant tokens are deployed on Flow Network with 
                  built-in compliance rules and investor protections.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-light text-blue-600">4</span>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-4">Market Launch</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  Tokens are listed on our marketplace for primary sales and 
                  secondary trading with full transparency and liquidity.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Investment Benefits */}
      <div className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 text-center">Investment Benefits</h2>
            <p className="text-xl text-gray-600 font-light text-center max-w-3xl mx-auto leading-relaxed mb-16">
              Experience the advantages of tokenized real-world asset investment 
              with enhanced liquidity, transparency, and accessibility.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <h3 className="text-2xl font-medium text-gray-900 mb-8">For Investors</h3>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-3"></div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Stable Yields</h4>
                      <p className="text-gray-600 font-light">8-12% annual returns backed by real assets with consistent income streams</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-3"></div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Portfolio Diversification</h4>
                      <p className="text-gray-600 font-light">Access multiple asset classes and global markets with a single platform</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-3"></div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Enhanced Liquidity</h4>
                      <p className="text-gray-600 font-light">Trade 24/7 on secondary markets vs. traditional illiquid investments</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-3"></div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Transparency</h4>
                      <p className="text-gray-600 font-light">Blockchain-based performance tracking and immutable transaction history</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                <h3 className="text-2xl font-medium text-gray-900 mb-8">For Asset Owners</h3>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-3"></div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Global Capital Access</h4>
                      <p className="text-gray-600 font-light">Tap into worldwide investor base for asset financing and growth</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-3"></div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Reduced Costs</h4>
                      <p className="text-gray-600 font-light">Lower issuance and management fees compared to traditional REITs</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-3"></div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Automated Compliance</h4>
                      <p className="text-gray-600 font-light">Built-in regulatory compliance and automated reporting</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-3"></div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Market Efficiency</h4>
                      <p className="text-gray-600 font-light">Streamlined investor onboarding and asset management</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Security & Compliance */}
      <div className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 text-center">Security & Compliance</h2>
            <p className="text-xl text-gray-600 font-light text-center max-w-3xl mx-auto leading-relaxed mb-16">
              Institutional-grade security and regulatory compliance ensure your investments 
              are protected by the highest industry standards.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
              >
                <h3 className="text-xl font-medium text-gray-900 mb-6">Regulatory Framework</h3>
                <ul className="space-y-3 text-gray-600 font-light">
                  <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2.5"></div>
                    <span>ERC-3643 compliance standard</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2.5"></div>
                    <span>KYC/AML verification protocols</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2.5"></div>
                    <span>Securities law compliance</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2.5"></div>
                    <span>Multi-jurisdiction support</span>
                  </li>
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
              >
                <h3 className="text-xl font-medium text-gray-900 mb-6">Technical Security</h3>
                <ul className="space-y-3 text-gray-600 font-light">
                  <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2.5"></div>
                    <span>Multi-signature wallet protection</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2.5"></div>
                    <span>Smart contract audits</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2.5"></div>
                    <span>Immutable blockchain records</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2.5"></div>
                    <span>Escrow-secured transactions</span>
                  </li>
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
              >
                <h3 className="text-xl font-medium text-gray-900 mb-6">Asset Protection</h3>
                <ul className="space-y-3 text-gray-600 font-light">
                  <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2.5"></div>
                    <span>Insurance coverage for assets</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2.5"></div>
                    <span>Legal structure validation</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2.5"></div>
                    <span>SPV verification system</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2.5"></div>
                    <span>Regular compliance audits</span>
                  </li>
                </ul>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Call to Action */}
      
    </div>
  );
};

export default About;