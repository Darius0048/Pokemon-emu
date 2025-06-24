import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import { GameProvider } from "./contexts/GameContext";
import GameEmulator from "./components/GameEmulator";
import RoomSystem from "./components/RoomSystem";
import RomUploader from "./components/RomUploader";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Gamepad2, Zap, Users, Shield } from "lucide-react";

const PokemonEmulatorApp = () => {
  const features = [
    {
      icon: <Gamepad2 className="w-6 h-6" />,
      title: "Game Boy Advance Emulator",
      description: "Play Pokémon Fire Red and Leaf Green directly in your browser with full GBA compatibility."
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Link Cable Emulation",
      description: "Trade Pokémon and battle friends using simulated link cable functionality over the internet."
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Room-Based Multiplayer",
      description: "Create or join private rooms to connect with friends for multiplayer gaming sessions."
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Save State Support",
      description: "Save and load your game progress anytime with built-in save state functionality."
    }
  ];

  return (
    <GameProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-blue-600 rounded-2xl shadow-lg">
                <Gamepad2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                Pokémon Multiplayer Emulator
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Play Pokémon Fire Red and Leaf Green with friends online. 
              Upload your ROM files and connect through link cable emulation for trading and battles.
            </p>
            <div className="flex justify-center gap-2">
              <Badge variant="secondary">Game Boy Advance</Badge>
              <Badge variant="secondary">Multiplayer</Badge>
              <Badge variant="secondary">Link Cable</Badge>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white/60 backdrop-blur-sm border-white/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-4 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white mb-3">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator className="my-8" />

          {/* Main Application */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Panel - Controls */}
            <div className="space-y-6">
              <RomUploader />
              <RoomSystem />
            </div>

            {/* Right Panel - Emulator */}
            <div className="lg:col-span-2">
              <GameEmulator />
            </div>
          </div>

          {/* Getting Started */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-center">Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto font-bold">1</div>
                  <h4 className="font-semibold">Upload ROM</h4>
                  <p className="text-sm text-muted-foreground">Upload your legally owned Pokémon Fire Red or Leaf Green ROM file</p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto font-bold">2</div>
                  <h4 className="font-semibold">Create/Join Room</h4>
                  <p className="text-sm text-muted-foreground">Create a new room or join an existing room with a friend</p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-pink-600 text-white rounded-full flex items-center justify-center mx-auto font-bold">3</div>
                  <h4 className="font-semibold">Play Together</h4>
                  <p className="text-sm text-muted-foreground">Start playing and use link cable features to trade and battle</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              <strong>Legal Notice:</strong> This emulator requires you to provide your own ROM files. 
              We do not distribute copyrighted game files.
            </p>
            <p className="mt-2">
              Pokémon is a trademark of Nintendo. This is an independent fan project.
            </p>
          </div>
        </div>
        <Toaster />
      </div>
    </GameProvider>
  );
};

const Home = () => {
  return <PokemonEmulatorApp />;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;