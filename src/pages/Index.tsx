import React from 'react';
import Header from '@/components/Header';
import HeroMain from '@/components/HeroMain';
import Features from '@/components/Features';
import Footer from '@/components/Footer';


const Index: React.FC = () => {
  return (
    <>
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1">
          <HeroMain />
          <Features />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
