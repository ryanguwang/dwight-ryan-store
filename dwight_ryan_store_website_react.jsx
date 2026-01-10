import React, { useEffect, useState } from "react";
import { ShoppingCart, Search, CheckCircle, Lock, Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";

// =====================
// CONFIG
// =====================
const ADMIN_PASSWORD = "1234"; // change if needed
const STORAGE_KEY = "dr_store_products_v1";
const GAME_KEY = "dr_store_game_v1";
const MAX_PLAYS_PER_DAY = 5;
const COINS_FOR_DISCOUNT = 50;
const DISCOUNT_RATE = 0.3; // 30%

// =====================
// Simple UI components
// =====================
const Card = ({ children, className = "" }) => <div className={`bg-white ${className}`}>{children}</div>;
const CardContent = ({ children, className = "" }) => <div className={className}>{children}</div>;
const Button = ({ children, className = "", style, ...props }) => (
  <button {...props} style={style} className={`rounded-lg text-white disabled:opacity-50 ${className}`}>
    {children}
  </button>
);

// =====================
// Brand
// =====================
const BRAND = { primary: "#cc0000", blue: "#2563eb", lightBlue: "#eff6ff" };

// =====================
// Products
// =====================
const initialProducts = [
  { id: 1, name: "Pre-Folded Papers Pack", price: 3, stock: 100, category: "Office" },
  { id: 2, name: "Drink Combo (40 drinks)", price: 25, stock: 50, category: "Food & Drinks" },
  { id: 3, name: "Sandwich Combo (20 sandwiches)", price: 40, stock: 40, category: "Food & Drinks" },
  { id: 4, name: "Custom Gift Card (load $15–$100)", price: 1, stock: 500, category: "Gift Cards" },
  { id: 8, name: "Pokémon Cards (Boy) + 1 Toy 🎁", price: 6, stock: 80, category: "Toys" },
  { id: 9, name: "Pokémon Cards (Girl) + 1 Toy 🎁", price: 6, stock: 80, category: "Toys" },
  { id: 10, name: "Cute Bookmarks 📑", price: 1, stock: 300, category: "School" },
  { id: 11, name: "Bookmark Bundle Deal 🎒 (5 for $4)", price: 4, stock: 120, category: "School" },
];

// =====================
// Helpers
// =====================
export const calculateTotal = (cart) => cart.reduce((s, p) => s + p.price, 0);
export const calculateGiftCardValue = (cart) => cart.filter((p) => p.category === "Gift Cards" && p.giftValue).reduce((s, p) => s + p.giftValue, 0);

const loadProducts = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialProducts;
    return JSON.parse(raw);
  } catch {
    return initialProducts;
  }
};

const saveProducts = (products) => localStorage.setItem(STORAGE_KEY, JSON.stringify(products));

// =====================
// Game helpers
// =====================
const todayKey = () => new Date().toISOString().slice(0, 10);

const loadGame = () => {
  const raw = localStorage.getItem(GAME_KEY);
  if (!raw) return { coins: 0, playsToday: 0, date: todayKey(), discountReady: false };
  const data = JSON.parse(raw);
  if (data.date !== todayKey()) return { coins: data.coins, playsToday: 0, date: todayKey(), discountReady: data.discountReady };
  return data;
};

const saveGame = (g) => localStorage.setItem(GAME_KEY, JSON.stringify(g));

// =====================
// Game Component
// =====================
function RunningGame({ onClose, onCoins }) {
  const seasons = ["Spring 🌸", "Summer ☀️", "Fall 🍂", "Winter ❄️"];
  const characters = ["🧒", "👧", "🤖", "🐱"];
  const [season, setSeason] = useState(seasons[0]);
  const [character, setCharacter] = useState(characters[0]);
  const [message, setMessage] = useState("");

  const [health, setHealth] = useState(3);
  const [energy, setEnergy] = useState(100);
  const [distance, setDistance] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(30);

  const [player, setPlayer] = useState({ x: 120, y: 120 });
  const [enemy, setEnemy] = useState({ x: 30, y: 30 });
  const [coinsOnMap, setCoinsOnMap] = useState([]);
  const [obstacles, setObstacles] = useState([]);
  const [running, setRunning] = useState(false);

  const boardSize = 260;

  const randomPoint = () => ({ x: Math.random() * 240, y: Math.random() * 240 });

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          finishRun();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (!running) return;

    const enemyInterval = setInterval(() => {
      setEnemy((e) => ({
        x: e.x + Math.sign(player.x - e.x) * 5,
        y: e.y + Math.sign(player.y - e.y) * 5,
      }));
    }, 500);

    return () => clearInterval(enemyInterval);
  }, [player, running]);

  useEffect(() => {
    const onKey = (e) => {
      if (!running) return;

      setPlayer((p) => {
        let { x, y } = p;
        const step = 10;
        if (e.key.toLowerCase() === "w") y -= step;
        if (e.key.toLowerCase() === "s") y += step;
        if (e.key.toLowerCase() === "a") x -= step;
        if (e.key.toLowerCase() === "d") x += step;
        return { x: Math.max(0, Math.min(240, x)), y: Math.max(0, Math.min(240, y)) };
      });

      setEnergy((e2) => Math.max(0, e2 - 1));
      setDistance((d) => d + 1);
      setLevel(1 + Math.floor(distance / 50));
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, distance]);

  useEffect(() => {
    if (!running) return;

    coinsOnMap.forEach((c, i) => {
      if (Math.hypot(player.x - c.x, player.y - c.y) < 12) {
        setCoinsOnMap((arr) => arr.filter((_, idx) => idx !== i));
        setDistance((d) => d + 5);
      }
    });

    obstacles.forEach((o) => {
      if (Math.hypot(player.x - o.x, player.y - o.y) < 12) {
        setHealth((h) => Math.max(0, h - 1));
      }
    });

    if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < 12) {
      setHealth((h) => Math.max(0, h - 1));
    }
  }, [player]);

  useEffect(() => {
    if (health <= 0 || energy <= 0) finishRun();
  }, [health, energy]);

  const startRun = () => {
    setHealth(3);
    setEnergy(100);
    setDistance(0);
    setLevel(1);
    setTimeLeft(30);
    setPlayer({ x: 120, y: 120 });
    setEnemy({ x: 30, y: 30 });
    setCoinsOnMap(Array.from({ length: 6 }, randomPoint));
    setObstacles(Array.from({ length: 4 }, randomPoint));
    setMessage("Use W A S D to move. Collect coins, avoid obstacles & enemy!");
    setRunning(true);
  };

  const saveLeaderboard = (score) => {
    const key = "dr_leaderboard";
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    data.push(score);
    data.sort((a, b) => b - a);
    localStorage.setItem(key, JSON.stringify(data.slice(0, 5)));
  };

  const finishRun = () => {
    if (!running) return;

    const state = loadGame();
    if (state.playsToday >= MAX_PLAYS_PER_DAY) {
      setMessage("Daily limit reached");
      setRunning(false);
      return;
    }

    const earned = Math.floor(distance / 10) + 5;
    const newCoins = state.coins + earned;
    const discountReady = newCoins >= COINS_FOR_DISCOUNT;

    const updated = {
      coins: newCoins,
      playsToday: state.playsToday + 1,
      date: todayKey(),
      discountReady,
    };

    saveGame(updated);
    onCoins(updated);
    saveLeaderboard(distance);

    setRunning(false);
    setMessage(`Finished! Distance ${distance}m | Coins +${earned}`);
  };

  const leaderboard = JSON.parse(localStorage.getItem("dr_leaderboard") || "[]");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: "white", padding: 16, borderRadius: 12, width: 360, textAlign: "center" }}>
        <h3>Running Game 🏃 (WASD)</h3>

        <div>Season:</div>
        {seasons.map((s) => (
          <button key={s} onClick={() => setSeason(s)} style={{ margin: 3 }}>{s}</button>
        ))}

        <div style={{ marginTop: 6 }}>Character:</div>
        {characters.map((c) => (
          <button key={c} onClick={() => setCharacter(c)} style={{ margin: 3 }}>{c}</button>
        ))}

        <div style={{ fontSize: 13, marginTop: 6 }}>
          ❤️ {health} | ⚡ {energy}% | 🏁 {distance}m | ⏱️ {timeLeft}s | Lv {level}
        </div>

        <div style={{ margin: "10px auto", width: boardSize, height: boardSize, background: BRAND.lightBlue, position: "relative", borderRadius: 8 }}>
          <div style={{ position: "absolute", left: player.x, top: player.y }}>{character}</div>
          <div style={{ position: "absolute", left: enemy.x, top: enemy.y }}>👾</div>

          {coinsOnMap.map((c, i) => (
            <div key={i} style={{ position: "absolute", left: c.x, top: c.y }}>🪙</div>
          ))}

          {obstacles.map((o, i) => (
            <div key={i} style={{ position: "absolute", left: o.x, top: o.y }}>🚧</div>
          ))}
        </div>

        {!running && <Button style={{ backgroundColor: BRAND.primary, width: "100%" }} onClick={startRun}>Start</Button>}
        {running && <Button style={{ backgroundColor: BRAND.blue, width: "100%" }} onClick={finishRun}>Finish</Button>}

        {message && <div style={{ marginTop: 6 }}>{message}</div>}

        <div style={{ marginTop: 8 }}>
          <strong>Leaderboard</strong>
          {leaderboard.map((s, i) => (
            <div key={i}>#{i + 1}: {s}m</div>
          ))}
        </div>

        <button onClick={onClose} style={{ marginTop: 10 }}>Close</button>
      </div>
    </div>
  );
}

// =====================
// Main App


// =====================
export default function StoreApp() {
  const [products, setProducts] = useState(loadProducts);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [orderComplete, setOrderComplete] = useState(false);
  const [email, setEmail] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [gameState, setGameState] = useState(loadGame());

  const [manualDiscount, setManualDiscount] = useState(false);
  const [coupon, setCoupon] = useState("");

  useEffect(() => saveProducts(products), [products]);

  const categories = ["All", ...new Set(products.map((p) => p.category))];

  const filteredProducts = products.filter((p) => {
    const matchCategory = category === "All" || p.category === category;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const addToCart = (product) => {
    if (product.stock <= 0) return alert("Out of stock");

    if (product.category === "Gift Cards") {
      const amount = prompt("Enter gift card amount ($15 to $100):", "25");
      const value = Number(amount);
      if (isNaN(value) || value < 15 || value > 100) return alert("Invalid amount");
      setCart([...cart, { ...product, giftValue: value }]);
      return;
    }

    setCart([...cart, product]);
  };

  const subtotal = calculateTotal(cart);

  const eligibleForDiscount = gameState.discountReady || manualDiscount || coupon === "RUN50";
  const discount = eligibleForDiscount ? subtotal * DISCOUNT_RATE : 0;
  const total = subtotal - discount;
  const giftCardTotalValue = calculateGiftCardValue(cart);

  const completeOrder = () => {
    const updated = products.map((p) => {
      const count = cart.filter((c) => c.id === p.id).length;
      return { ...p, stock: p.stock - count };
    });

    setProducts(updated);
    setCart([]);
    setOrderComplete(true);

    if (gameState.discountReady) {
      const reset = { ...gameState, coins: gameState.coins - COINS_FOR_DISCOUNT, discountReady: false };
      saveGame(reset);
      setGameState(reset);
    }

    setManualDiscount(false);
    setCoupon("");
  };

  const loginAdmin = () => {
    const pwd = prompt("Enter admin password:");
    if (pwd === ADMIN_PASSWORD) setAdminMode(true);
    else alert("Wrong password");
  };

  const updateStock = (id, value) => setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: Number(value) } : p)));

  if (orderComplete) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.lightBlue }}>
        <div style={{ background: "white", padding: 24, borderRadius: 12, textAlign: "center" }}>
          <CheckCircle size={48} color="green" />
          <h2>Order confirmed!</h2>
          <Button style={{ backgroundColor: BRAND.primary, padding: 10 }} onClick={() => setOrderComplete(false)}>
            Continue shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BRAND.lightBlue }}>
      {/* Header */}
      <div style={{ background: "white", padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <strong style={{ color: BRAND.primary }}>D&R</strong>

        <div style={{ flex: 1, display: "flex", alignItems: "center", background: BRAND.lightBlue, borderRadius: 20, padding: "4px 8px" }}>
          <Search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" style={{ border: 0, outline: 0, background: "transparent", marginLeft: 6 }} />
        </div>

        <button onClick={() => setShowGame(true)} title="Play game" style={{ color: BRAND.blue }}>
          <Gamepad2 />
        </button>

        <button onClick={loginAdmin} title="Admin login">
          <Lock size={18} />
        </button>

        <div style={{ position: "relative", color: BRAND.blue }}>
          <ShoppingCart />
          {cart.length > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: BRAND.primary, color: "white", borderRadius: "50%", fontSize: 10, padding: "2px 5px" }}>{cart.length}</span>}
        </div>
      </div>

      {/* Categories */}
      <div style={{ padding: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {categories.map((c) => (
          <button key={c} onClick={() => setCategory(c)} style={{ background: category === c ? BRAND.primary : BRAND.blue, color: "white", border: 0, borderRadius: 20, padding: "4px 10px" }}>
            {c}
          </button>
        ))}
      </div>

      {/* Banner */}
      <div style={{ padding: 12 }}>
        <div style={{ background: "linear-gradient(90deg,#dbeafe,#fee2e2)", borderRadius: 16, padding: 12, marginBottom: 12 }}>
          🎮 Play the Running Game! 50 coins = 30% OFF | Code: RUN50
        </div>
      </div>

      {/* Products */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, padding: 12 }}>
        {filteredProducts.map((p) => (
          <motion.div key={p.id} whileHover={{ scale: 1.03 }}>
            <Card className="rounded-xl" style={{ padding: 10 }}>
              <CardContent>
                <div style={{ background: BRAND.lightBlue, height: 60, borderRadius: 8, textAlign: "center", lineHeight: "60px" }}>🧸</div>
                <strong>{p.name}</strong>
                <div>Stock: {p.stock}</div>
                <div>${p.price.toFixed(2)}</div>

                {adminMode ? (
                  <input type="number" value={p.stock} onChange={(e) => updateStock(p.id, e.target.value)} style={{ width: "100%", marginTop: 6 }} />
                ) : (
                  <Button style={{ backgroundColor: BRAND.primary, width: "100%", marginTop: 6, padding: 6 }} onClick={() => addToCart(p)}>
                    Add to cart 🛒
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Cart */}
      {cart.length > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", borderTop: "1px solid #ccc", padding: 12 }}>
          <div>Subtotal: ${subtotal.toFixed(2)}</div>

          {eligibleForDiscount && <div style={{ color: "green" }}>Discount applied: -${discount.toFixed(2)}</div>}

          <div><strong>Total: ${total.toFixed(2)}</strong></div>

          {giftCardTotalValue > 0 && <div>Gift card balance loaded: ${giftCardTotalValue.toFixed(2)}</div>}

          {gameState.discountReady && !manualDiscount && (
            <Button style={{ backgroundColor: BRAND.blue, width: "100%", marginTop: 6 }} onClick={() => setManualDiscount(true)}>
              Use my 30% game discount
            </Button>
          )}

          <input placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} style={{ width: "100%", marginTop: 6 }} />

          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", marginTop: 6 }} />

          <Button style={{ backgroundColor: BRAND.primary, width: "100%", marginTop: 6, padding: 8 }} onClick={completeOrder}>
            Checkout (Visa / PayPal / Cash / QR)
          </Button>
        </div>
      )}

      <div style={{ padding: 20, textAlign: "center", color: "#666" }}>
        Coins: {gameState.coins} | Plays today: {gameState.playsToday}/{MAX_PLAYS_PER_DAY}
      </div>

      <div style={{ padding: 40, textAlign: "center", color: "#666" }}>© {new Date().getFullYear()} Dwight & Ryan Store</div>

      {showGame && <RunningGame onClose={() => setShowGame(false)} onCoins={(g) => setGameState(g)} />}
    </div>
  );
}

// =====================
// Tests
// =====================
if (process.env.NODE_ENV === "test") {
  const mockCart = [
    { id: 1, price: 3, category: "Office" },
    { id: 4, price: 1, category: "Gift Cards", giftValue: 25 },
  ];

  console.assert(calculateTotal(mockCart) === 4, "Total calculation failed");
  console.assert(calculateGiftCardValue(mockCart) === 25, "Gift card value calculation failed");

  const g = loadGame();
  console.assert(typeof g.coins === "number", "Coins should be number");
  console.assert(g.playsToday <= MAX_PLAYS_PER_DAY, "Plays limit broken");

  const testSubtotal = 100;
  const testDiscount = testSubtotal * DISCOUNT_RATE;
  console.assert(testDiscount === 30, "Discount calculation failed");
}
