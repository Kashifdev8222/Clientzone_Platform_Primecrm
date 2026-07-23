/** Full CryptoPay catalog (PrimeCRM / portal ClientZone shape). */
export type CryptoNetwork = {
  network: string;
  name: string;
  coin_withdrawals?: { enabled: boolean };
};

export type CryptoCoin = {
  currency: string;
  name: string;
  networks: CryptoNetwork[];
};

const n = (network: string, name: string): CryptoNetwork => ({
  network,
  name,
  coin_withdrawals: { enabled: true },
});

/** Matches live PrimeCRM crypto + network dropdowns used by the PHP portal. */
export const CRYPTO_PAY_CATALOG: CryptoCoin[] = [
  {
    currency: 'BTC',
    name: 'Bitcoin',
    networks: [n('bitcoin', 'Bitcoin'), n('bnb_smart_chain', 'BNB Smart Chain (BEP20)')],
  },
  {
    currency: 'LTC',
    name: 'Litecoin',
    networks: [n('litecoin', 'Litecoin'), n('bnb_smart_chain', 'BNB Smart Chain (BEP20)')],
  },
  {
    currency: 'BCH',
    name: 'Bitcoin Cash',
    networks: [
      n('bitcoin_cash', 'Bitcoin Cash'),
      n('bnb_smart_chain', 'BNB Smart Chain (BEP20)'),
    ],
  },
  {
    currency: 'XRP',
    name: 'XRP',
    networks: [n('ripple', 'Ripple'), n('bnb_smart_chain', 'BNB Smart Chain (BEP20)')],
  },
  {
    currency: 'ETH',
    name: 'Ethereum',
    networks: [
      n('ethereum', 'Ethereum (ERC20)'),
      n('bnb_smart_chain', 'BNB Smart Chain (BEP20)'),
    ],
  },
  {
    currency: 'IMX',
    name: 'ImmutableX',
    networks: [n('ethereum', 'Ethereum (ERC20)')],
  },
  {
    currency: 'USDT',
    name: 'Tether',
    networks: [
      n('ethereum', 'Ethereum (ERC20)'),
      n('tron', 'Tron (TRC20)'),
      n('bnb_smart_chain', 'BNB Smart Chain (BEP20)'),
      n('solana', 'Solana'),
      n('polygon', 'Polygon'),
      n('ton', 'TON'),
    ],
  },
  {
    currency: 'DAI',
    name: 'Dai',
    networks: [
      n('ethereum', 'Ethereum (ERC20)'),
      n('bnb_smart_chain', 'BNB Smart Chain (BEP20)'),
    ],
  },
  {
    currency: 'USDC',
    name: 'USD Coin',
    networks: [
      n('ethereum', 'Ethereum (ERC20)'),
      n('bnb_smart_chain', 'BNB Smart Chain (BEP20)'),
      n('solana', 'Solana'),
      n('polygon', 'Polygon'),
    ],
  },
  {
    currency: 'SHIB',
    name: 'Shiba Inu',
    networks: [
      n('ethereum', 'Ethereum (ERC20)'),
      n('bnb_smart_chain', 'BNB Smart Chain (BEP20)'),
    ],
  },
  {
    currency: 'XLM',
    name: 'Stellar Lumens',
    networks: [n('stellar', 'Stellar'), n('bnb_smart_chain', 'BNB Smart Chain (BEP20)')],
  },
  {
    currency: 'ADA',
    name: 'Cardano',
    networks: [n('cardano', 'Cardano'), n('bnb_smart_chain', 'BNB Smart Chain (BEP20)')],
  },
  {
    currency: 'BNB',
    name: 'BNB',
    networks: [n('bnb_smart_chain', 'BNB Smart Chain (BEP20)')],
  },
  {
    currency: 'TRX',
    name: 'TRON',
    networks: [n('tron', 'Tron (TRC20)'), n('bnb_smart_chain', 'BNB Smart Chain (BEP20)')],
  },
  {
    currency: 'DOGE',
    name: 'Dogecoin',
    networks: [n('dogecoin', 'Dogecoin'), n('bnb_smart_chain', 'BNB Smart Chain (BEP20)')],
  },
  {
    currency: 'SOL',
    name: 'Solana',
    networks: [n('solana', 'Solana'), n('bnb_smart_chain', 'BNB Smart Chain (BEP20)')],
  },
  {
    currency: 'POL',
    name: 'Polygon',
    networks: [n('polygon', 'Polygon')],
  },
  {
    currency: 'GRAM',
    name: 'Gram',
    networks: [n('ton', 'TON')],
  },
  {
    currency: 'ARB',
    name: 'Arbitrum',
    networks: [n('arbitrum', 'Arbitrum')],
  },
  {
    currency: 'FTN',
    name: 'Fasttoken',
    networks: [n('bahamut', 'Bahamut')],
  },
];

export function resolveCryptoCatalog(
  raw?: string[] | Array<Record<string, unknown>>,
): CryptoCoin[] {
  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    return CRYPTO_PAY_CATALOG;
  }

  // Short string list like ["BTC","ETH"] → expand from full catalog (keep portal parity)
  if (typeof raw[0] === 'string') {
    const wanted = new Set(
      (raw as string[]).map((s) => String(s).toUpperCase()),
    );
    const filtered = CRYPTO_PAY_CATALOG.filter((c) => wanted.has(c.currency));
    // If config only has 3–4 coins, still return full catalog for mock ClientZone
    // so deposit UI matches PrimeCRM. Real PSP filtering can come later via config.mode.
    if (filtered.length > 0 && filtered.length < 8) {
      return CRYPTO_PAY_CATALOG;
    }
    return filtered.length ? filtered : CRYPTO_PAY_CATALOG;
  }

  return (raw as Array<Record<string, unknown>>).map((item) => {
    const currency = String(item.currency || item.symbol || '').toUpperCase();
    const hit = CRYPTO_PAY_CATALOG.find((d) => d.currency === currency);
    const networks = Array.isArray(item.networks)
      ? (item.networks as CryptoNetwork[])
      : hit?.networks || [
          {
            network: currency.toLowerCase(),
            name: currency,
            coin_withdrawals: { enabled: true },
          },
        ];
    return {
      currency,
      name: String(item.name || hit?.name || currency),
      networks,
    };
  });
}
