// GENERATED from data/tariffs.json by scripts/gen-data.mjs. Do not edit by hand.
export const tariffsData: unknown = {
  "schemaVersion": 2,
  "updated": "2026-10-21",
  "currency": "EGP",
  "notes": [
    "Rates are piasters per kWh (at most 2 decimals); fees are integer piasters per month.",
    "A month's total kWh selects ONE band of the customer's class; each band prices its kWh from zero with its own rule.",
    "Stamps: perKWh piasters per kWh (commercial, lighting, irrigation), per10KWh piasters per 10 kWh (industry). The 3 EGP annual supply stamp is not included.",
    "Voltage-class prices assume a power factor of at least 0.92; demand charges (if any on a bill) are not included.",
    "2026-07 non-residential prices repeat 2026-04: no source reports a change (medium confidence).",
    "Research, sources and confidence levels: docs/research/tariff.md and docs/research/tariff-classes.md"
  ],
  "versions": [
    {
      "id": "2024-08",
      "validFrom": "2024-08",
      "confidence": "high",
      "classes": {
        "residential": {
          "bands": [
            {
              "upTo": 100,
              "mode": "progressive",
              "tiers": [
                {
                  "tier": 1,
                  "upTo": 50,
                  "rate": 68
                },
                {
                  "tier": 2,
                  "upTo": 100,
                  "rate": 78
                }
              ]
            },
            {
              "upTo": 650,
              "mode": "progressive",
              "tiers": [
                {
                  "tier": 3,
                  "upTo": 200,
                  "rate": 95
                },
                {
                  "tier": 4,
                  "upTo": 350,
                  "rate": 155
                },
                {
                  "tier": 5,
                  "upTo": 650,
                  "rate": 195
                }
              ]
            },
            {
              "upTo": 1000,
              "mode": "flat",
              "tier": 6,
              "rate": 210
            },
            {
              "upTo": null,
              "mode": "flat",
              "tier": 7,
              "rate": 223
            }
          ],
          "serviceFees": [
            {
              "upTo": 50,
              "fee": 100
            },
            {
              "upTo": 100,
              "fee": 200
            },
            {
              "upTo": 200,
              "fee": 600
            },
            {
              "upTo": 350,
              "fee": 1100
            },
            {
              "upTo": 650,
              "fee": 1500
            },
            {
              "upTo": 1000,
              "fee": 2500
            },
            {
              "upTo": null,
              "fee": 4000
            }
          ],
          "zeroReadFee": 900,
          "confidence": "high"
        },
        "commercial": {
          "bands": [
            {
              "upTo": 100,
              "mode": "flat",
              "tier": 1,
              "rate": 85
            },
            {
              "upTo": 250,
              "mode": "flat",
              "tier": 2,
              "rate": 168
            },
            {
              "upTo": 1000,
              "mode": "progressive",
              "tiers": [
                {
                  "tier": 3,
                  "upTo": 600,
                  "rate": 220
                },
                {
                  "tier": 4,
                  "upTo": 1000,
                  "rate": 227
                }
              ]
            },
            {
              "upTo": null,
              "mode": "flat",
              "tier": 5,
              "rate": 233
            }
          ],
          "serviceFees": [
            {
              "upTo": 100,
              "fee": 500
            },
            {
              "upTo": 250,
              "fee": 1500
            },
            {
              "upTo": 600,
              "fee": 2000
            },
            {
              "upTo": 1000,
              "fee": 2500
            },
            {
              "upTo": null,
              "fee": 4000
            }
          ],
          "zeroReadFee": 900,
          "stamps": {
            "perKWh": 3
          },
          "confidence": "high"
        },
        "coded": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 214
            }
          ],
          "serviceFees": [
            {
              "upTo": 50,
              "fee": 100
            },
            {
              "upTo": 100,
              "fee": 200
            },
            {
              "upTo": 200,
              "fee": 600
            },
            {
              "upTo": 350,
              "fee": 1100
            },
            {
              "upTo": 650,
              "fee": 1500
            },
            {
              "upTo": 1000,
              "fee": 2500
            },
            {
              "upTo": null,
              "fee": 4000
            }
          ],
          "confidence": "low"
        },
        "extraHighVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 160
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 3500
            }
          ],
          "stamps": {
            "per10KWh": 0.6
          },
          "confidence": "high"
        },
        "highVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 174
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 3500
            }
          ],
          "stamps": {
            "per10KWh": 0.6
          },
          "confidence": "high"
        },
        "mediumVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 194
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 3500
            }
          ],
          "stamps": {
            "per10KWh": 0.6
          },
          "confidence": "high"
        },
        "lowVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 234
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 1500
            }
          ],
          "stamps": {
            "per10KWh": 0.6
          },
          "confidence": "high"
        },
        "irrigationMediumVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 194
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 3500
            }
          ],
          "stamps": {
            "perKWh": 3
          },
          "confidence": "medium"
        },
        "irrigationLowVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 200
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 400
            }
          ],
          "stamps": {
            "perKWh": 3
          },
          "confidence": "medium"
        },
        "publicLighting": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 234
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 1500
            }
          ],
          "stamps": {
            "perKWh": 3
          },
          "confidence": "high"
        }
      },
      "sources": [
        "https://egyptera.org/ar/TarrifAug2024.aspx",
        "https://www.masrawy.com/news/news_egypt/details/2026/4/8/2969171"
      ]
    },
    {
      "id": "2026-04",
      "validFrom": "2026-04",
      "confidence": "high",
      "classes": {
        "residential": {
          "bands": [
            {
              "upTo": 100,
              "mode": "progressive",
              "tiers": [
                {
                  "tier": 1,
                  "upTo": 50,
                  "rate": 68
                },
                {
                  "tier": 2,
                  "upTo": 100,
                  "rate": 78
                }
              ]
            },
            {
              "upTo": 650,
              "mode": "progressive",
              "tiers": [
                {
                  "tier": 3,
                  "upTo": 200,
                  "rate": 95
                },
                {
                  "tier": 4,
                  "upTo": 350,
                  "rate": 155
                },
                {
                  "tier": 5,
                  "upTo": 650,
                  "rate": 195
                }
              ]
            },
            {
              "upTo": 1000,
              "mode": "flat",
              "tier": 6,
              "rate": 210
            },
            {
              "upTo": null,
              "mode": "flat",
              "tier": 7,
              "rate": 258
            }
          ],
          "serviceFees": [
            {
              "upTo": 50,
              "fee": 100
            },
            {
              "upTo": 100,
              "fee": 200
            },
            {
              "upTo": 200,
              "fee": 600
            },
            {
              "upTo": 350,
              "fee": 1100
            },
            {
              "upTo": 650,
              "fee": 1500
            },
            {
              "upTo": 1000,
              "fee": 2500
            },
            {
              "upTo": null,
              "fee": 4000
            }
          ],
          "zeroReadFee": 900,
          "confidence": "high"
        },
        "commercial": {
          "bands": [
            {
              "upTo": 100,
              "mode": "flat",
              "tier": 1,
              "rate": 162
            },
            {
              "upTo": 250,
              "mode": "flat",
              "tier": 2,
              "rate": 216
            },
            {
              "upTo": 1000,
              "mode": "progressive",
              "tiers": [
                {
                  "tier": 3,
                  "upTo": 600,
                  "rate": 264
                },
                {
                  "tier": 4,
                  "upTo": 1000,
                  "rate": 274
                }
              ]
            },
            {
              "upTo": null,
              "mode": "flat",
              "tier": 5,
              "rate": 279
            }
          ],
          "serviceFees": [
            {
              "upTo": 100,
              "fee": 500
            },
            {
              "upTo": 250,
              "fee": 1500
            },
            {
              "upTo": 600,
              "fee": 2000
            },
            {
              "upTo": 1000,
              "fee": 2500
            },
            {
              "upTo": null,
              "fee": 4000
            }
          ],
          "zeroReadFee": 900,
          "stamps": {
            "perKWh": 3
          },
          "confidence": "high"
        },
        "coded": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 274
            }
          ],
          "serviceFees": [
            {
              "upTo": 50,
              "fee": 100
            },
            {
              "upTo": 100,
              "fee": 200
            },
            {
              "upTo": 200,
              "fee": 600
            },
            {
              "upTo": 350,
              "fee": 1100
            },
            {
              "upTo": 650,
              "fee": 1500
            },
            {
              "upTo": 1000,
              "fee": 2500
            },
            {
              "upTo": null,
              "fee": 4000
            }
          ],
          "confidence": "low"
        },
        "extraHighVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 189
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 3500
            }
          ],
          "stamps": {
            "per10KWh": 0.6
          },
          "confidence": "high"
        },
        "highVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 205
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 3500
            }
          ],
          "stamps": {
            "per10KWh": 0.6
          },
          "confidence": "high"
        },
        "mediumVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 255
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 3500
            }
          ],
          "stamps": {
            "per10KWh": 0.6
          },
          "confidence": "high"
        },
        "lowVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 274
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 1500
            }
          ],
          "stamps": {
            "per10KWh": 0.6
          },
          "confidence": "high"
        },
        "irrigationMediumVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 255
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 3500
            }
          ],
          "stamps": {
            "perKWh": 3
          },
          "confidence": "medium"
        },
        "irrigationLowVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 265
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 400
            }
          ],
          "stamps": {
            "perKWh": 3
          },
          "confidence": "medium"
        },
        "publicLighting": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 274
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 1500
            }
          ],
          "stamps": {
            "perKWh": 3
          },
          "confidence": "high"
        }
      },
      "sources": [
        "https://egyptera.org/en/TarrifApril2026.aspx",
        "https://www.elwatannews.com/news/details/8293997",
        "https://www.elbalad.news/7007770"
      ]
    },
    {
      "id": "2026-07",
      "validFrom": "2026-07",
      "confidence": "medium",
      "classes": {
        "residential": {
          "bands": [
            {
              "upTo": 100,
              "mode": "progressive",
              "tiers": [
                {
                  "tier": 1,
                  "upTo": 50,
                  "rate": 68
                },
                {
                  "tier": 2,
                  "upTo": 100,
                  "rate": 98
                }
              ]
            },
            {
              "upTo": 650,
              "mode": "progressive",
              "tiers": [
                {
                  "tier": 3,
                  "upTo": 200,
                  "rate": 115
                },
                {
                  "tier": 4,
                  "upTo": 350,
                  "rate": 173
                },
                {
                  "tier": 5,
                  "upTo": 650,
                  "rate": 214
                }
              ]
            },
            {
              "upTo": 1000,
              "mode": "flat",
              "tier": 6,
              "rate": 241
            },
            {
              "upTo": null,
              "mode": "flat",
              "tier": 7,
              "rate": 274
            }
          ],
          "serviceFees": [
            {
              "upTo": 50,
              "fee": 100
            },
            {
              "upTo": 100,
              "fee": 200
            },
            {
              "upTo": 200,
              "fee": 600
            },
            {
              "upTo": 350,
              "fee": 1100
            },
            {
              "upTo": 650,
              "fee": 1500
            },
            {
              "upTo": 1000,
              "fee": 2500
            },
            {
              "upTo": null,
              "fee": 4000
            }
          ],
          "zeroReadFee": 900,
          "confidence": "medium"
        },
        "commercial": {
          "bands": [
            {
              "upTo": 100,
              "mode": "flat",
              "tier": 1,
              "rate": 162
            },
            {
              "upTo": 250,
              "mode": "flat",
              "tier": 2,
              "rate": 216
            },
            {
              "upTo": 1000,
              "mode": "progressive",
              "tiers": [
                {
                  "tier": 3,
                  "upTo": 600,
                  "rate": 264
                },
                {
                  "tier": 4,
                  "upTo": 1000,
                  "rate": 274
                }
              ]
            },
            {
              "upTo": null,
              "mode": "flat",
              "tier": 5,
              "rate": 279
            }
          ],
          "serviceFees": [
            {
              "upTo": 100,
              "fee": 500
            },
            {
              "upTo": 250,
              "fee": 1500
            },
            {
              "upTo": 600,
              "fee": 2000
            },
            {
              "upTo": 1000,
              "fee": 2500
            },
            {
              "upTo": null,
              "fee": 4000
            }
          ],
          "zeroReadFee": 900,
          "stamps": {
            "perKWh": 3
          },
          "confidence": "medium"
        },
        "coded": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 274
            }
          ],
          "serviceFees": [
            {
              "upTo": 50,
              "fee": 100
            },
            {
              "upTo": 100,
              "fee": 200
            },
            {
              "upTo": 200,
              "fee": 600
            },
            {
              "upTo": 350,
              "fee": 1100
            },
            {
              "upTo": 650,
              "fee": 1500
            },
            {
              "upTo": 1000,
              "fee": 2500
            },
            {
              "upTo": null,
              "fee": 4000
            }
          ],
          "confidence": "low"
        },
        "extraHighVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 189
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 3500
            }
          ],
          "stamps": {
            "per10KWh": 0.6
          },
          "confidence": "medium"
        },
        "highVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 205
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 3500
            }
          ],
          "stamps": {
            "per10KWh": 0.6
          },
          "confidence": "medium"
        },
        "mediumVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 255
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 3500
            }
          ],
          "stamps": {
            "per10KWh": 0.6
          },
          "confidence": "medium"
        },
        "lowVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 274
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 1500
            }
          ],
          "stamps": {
            "per10KWh": 0.6
          },
          "confidence": "medium"
        },
        "irrigationMediumVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 255
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 3500
            }
          ],
          "stamps": {
            "perKWh": 3
          },
          "confidence": "medium"
        },
        "irrigationLowVoltage": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 265
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 400
            }
          ],
          "stamps": {
            "perKWh": 3
          },
          "confidence": "medium"
        },
        "publicLighting": {
          "bands": [
            {
              "upTo": null,
              "mode": "flat",
              "tier": 0,
              "rate": 274
            }
          ],
          "serviceFees": [
            {
              "upTo": null,
              "fee": 1500
            }
          ],
          "stamps": {
            "perKWh": 3
          },
          "confidence": "medium"
        }
      },
      "sources": [
        "https://www.youm7.com/story/2026/8/1/%D8%B1%D8%B3%D9%85%D9%8A%D8%A7-%D9%85%D8%B1%D9%81%D9%82-%D8%A7%D9%84%D9%83%D9%87%D8%B1%D8%A8%D8%A7%D8%A1-%D9%8A%D9%86%D8%B4%D8%B1-%D8%A3%D8%B3%D8%B9%D8%A7%D8%B1-%D8%A7%D9%84%D8%B4%D8%B1%D8%A7%D8%A6%D8%AD-%D9%88%D9%86%D8%B3%D8%A8-%D8%AF%D8%B9%D9%85-%D8%AA%D8%AA%D8%AD%D9%85%D9%84%D9%87%D8%A7-%D8%A7%D9%84%D8%AF%D9%88%D9%84%D8%A9/7499635",
        "https://www.masrawy.com/news/news_egypt/details/2026/8/1/3026220/",
        "https://www.elbalad.news/7057875",
        "https://www.egypttelegraph.com/article/266224/",
        "https://egyptera.org/en/TarrifApril2026.aspx"
      ]
    }
  ]
};
