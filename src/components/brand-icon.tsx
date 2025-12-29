import { 
  ShoppingBag, 
  Utensils, 
  Car, 
  Home, 
  Zap, 
  HeartPulse, 
  Gamepad2, 
  GraduationCap, 
  Plane, 
  HelpCircle, 
  PiggyBank, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  CreditCard, 
  Banknote,
  Repeat,
  Wifi,
  Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";

const brands: Record<string, string> = {
  spotify: "spotify",
  netflix: "netflix",
  youtube: "youtube",
  hbo: "hbo",
  disney: "disneyplus",
  globoplay: "globo",
  globo: "globo",
  prime: "amazon",
  twitch: "twitch",
  steam: "steam",
  playstation: "playstation",
  xbox: "xbox",
  nintendo: "nintendo",
  paramount: "paramountplus",
  crunchyroll: "crunchyroll",
  deezer: "deezer",
  apple: "apple",
  icloud: "icloud",

  nubank: "nubank",
  inter: "bancointer",
  itau: "itau",
  itaú: "itau",
  bradesco: "bradesco",
  santander: "santander",
  caixa: "caixa",
  bb: "bancodobrasil",
  "banco do brasil": "bancodobrasil",
  c6: "c6bank",
  picpay: "picpay",
  paypal: "paypal",
  wise: "wise",
  mastercard: "mastercard",
  visa: "visa",
  elo: "elo",
  binance: "binance",
  btg: "btg pactual",
  xp: "xp",
  rico: "xp",

  uber: "uber",
  "99": "99",
  airbnb: "airbnb",
  booking: "booking",
  shell: "shell",
  ipiranga: "ipiranga",
  petrobras: "petrobras",
  latam: "latam",
  azul: "azul",
  gol: "gol",
  localiza: "localiza",
  movida: "movida",
  seminove: "seminove",

  ifood: "ifood",
  rappi: "rappi",
  "zé delivery": "zedelivery",
  mc: "mcdonalds",
  mcdonalds: "mcdonalds",
  bk: "burgerking",
  "burger king": "burgerking",
  subway: "subway",
  starbucks: "starbucks",
  dominos: "dominos",
  pizza: "pizzahut",
  kfc: "kfc",
  cocacola: "cocacola",
  pepsi: "pepsi",
  nespresso: "nespresso",

  "mercado livre": "mercadolibre",
  mercadolivre: "mercadolibre",
  shopee: "shopee",
  shein: "shein",
  aliexpress: "aliexpress",
  magalu: "magazineluiza",
  "magazine luiza": "magazineluiza",
  amazon: "amazon",
  nike: "nike",
  adidas: "adidas",
  zara: "zara",
  renner: "lojasrenner",
  riachuelo: "riachuelo",
  cea: "canda",
  decathlon: "decathlon",
  centauro: "centauro",
  sephora: "sephora",
  boticario: "oboticario",
  natura: "natura",
  avon: "avon",
  paguemenos: "paguemenos",
  drogasil: "drogaraia",

  assai: "assai",
  carrefour: "carrefour",
  "pão de açúcar": "groupecasino",
  extra: "groupecasino",
  walmart: "walmart",
  sams: "samsclub",
  atacadao: "carrefour",

  google: "google",
  microsoft: "microsoft",
  adobe: "adobe",
  chatgpt: "openai",
  openai: "openai",
  claro: "claro",
  vivo: "vivo",
  tim: "tim",
  oi: "oi",
  correios: "correios",
  loggi: "loggi",
  smartfit: "smartfit",
  bluefit: "bluefit",
  gympass: "gympass",
  totalpass: "totalpass"
};

const categoryIcons: Record<string, any> = {
  "alimentação": Utensils,
  "transporte": Car,
  "moradia": Home,
  "lazer": Gamepad2,
  "saúde": HeartPulse,
  "educação": GraduationCap,
  "salário": ArrowUpCircle,
  "investimento": PiggyBank,
  "cartão de crédito": CreditCard,
  "empréstimo": Banknote,
  "outros": HelpCircle,
  "compras": ShoppingBag,
  "contas": Zap,
  "viagem": Plane,
  "assinatura": Repeat,
  "internet": Wifi,
  "telefone": Smartphone,
  "celular": Smartphone
};

interface BrandIconProps {
  description: string;
  category?: string;
  type?: "income" | "expense";
  className?: string;
}

export function BrandIcon({ description, category = "Outros", type = "expense", className }: BrandIconProps) {
  const lowerDesc = description.toLowerCase();
  
  const brandKey = Object.keys(brands).find(key => lowerDesc.includes(key));

  if (brandKey) {
    const slug = brands[brandKey];
    return (
      <div className={cn("rounded-full overflow-hidden flex items-center justify-center bg-white/10 shrink-0 p-[2px]", className)}>
        <img 
          src={`https://cdn.simpleicons.org/${slug}/white`} 
          alt={brandKey}
          className="w-3/5 h-3/5 object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  const catKey = category.toLowerCase();
  const Icon = categoryIcons[catKey] || (type === "income" ? ArrowUpCircle : HelpCircle);

  return (
    <div className={cn("rounded-full flex items-center justify-center shrink-0", 
      type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-indigo-500/10 text-indigo-400",
      className
    )}>
      <Icon size={20} className="w-3/5 h-3/5" />
    </div>
  );
}