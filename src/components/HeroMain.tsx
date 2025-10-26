"use client";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { RetroGrid } from "@/components/magicui/retro-grid";
import { BorderBeam } from "@/components/magicui/border-beam";
import { motion } from "motion/react";

const Hero: React.FC = () => {
  const navigate = useNavigate();

  const handleExploreMarketplace = () => {
    navigate('/marketplace');
  };

  const handleLearnMore = () => {
    navigate('/about');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <BackgroundBeamsWithCollision className="min-h-screen bg-black">
        <RetroGrid
          className="absolute inset-0"
          angle={30}
          cellSize={80}
          opacity={0.2}
          lightLineColor="rgba(255,255,255,0.05)"
          darkLineColor="rgba(255,255,255,0.05)"
        />

        {/* Floating geometric shapes - darker */}
        <motion.div
          className="absolute top-20 left-10 w-20 h-20 border border-purple-500/20 rounded-full"
          animate={{
            y: [0, -20, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-br from-purple-900/30 to-black/50 rounded-lg rotate-45 border border-purple-500/10"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-32 left-1/4 w-12 h-12 border-2 border-pink-500/20 rounded-full bg-black/20"
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="relative z-10 text-center max-w-5xl px-4 py-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative mb-8"
          >
            <BorderBeam
              size={300}
              duration={12}
              delay={9}
              colorFrom="#1e1b4b"
              colorTo="#581c87"
              className="rounded-2xl"
            />
            <h1 className="text-6xl md:text-8xl font-black tracking-tight text-gray-500 mb-4 drop-shadow-2xl relative">
              <motion.span
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="block"
              >
                Unlock the
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="block bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent"
              >
                Future
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="block"
              >
                of Asset Tokenization
              </motion.span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="flex flex-col sm:flex-row gap-8 justify-center items-center"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <BorderBeam
                size={100}
                duration={3}
                colorFrom="#1e1b4b"
                colorTo="#581c87"
                className="rounded-full"
              />
              <Button
                className={cn(
                  "relative bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 hover:from-purple-800 hover:via-purple-700 hover:to-indigo-800 text-white text-xl py-6 px-12 font-bold rounded-full shadow-2xl shadow-purple-900/50 hover:shadow-purple-900/70 transform transition-all duration-300 border-2 border-purple-500/30 backdrop-blur-sm"
                )}
                onClick={handleExploreMarketplace}
              >
                <span className="relative z-10">Start Investing</span>
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                className="border-2 border-purple-500/90 text-purple-500 hover:bg-purple-900/30 hover:border-purple-400 text-xl py-6 px-12 font-bold rounded-full shadow-xl shadow-purple-900/30 hover:shadow-purple-900/30 transform transition-all duration-300 backdrop-blur-sm"
                onClick={handleLearnMore}
              >
                <span className="flex items-center gap-2">
                   Discover More
                </span>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </BackgroundBeamsWithCollision>
    </div>
  );
};

export default Hero;