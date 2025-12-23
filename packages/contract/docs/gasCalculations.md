# Chainlink Functions Fee Estimation

_Calcluations are based on documentation of chainlink functions: https://docs.chain.link/chainlink-functions/resources/billing#cost-calculation-fulfillment_

## 1️⃣ How LINK Fee is Calculated

When a Chainlink Functions request is fulfilled, the subscription is charged based on the gas used in the callback and a USD-denominated premium fee.

### Formula

1. **Gas cost in LINK**:

```
Gas Cost (LINK) = (Gas Price * (Callback Gas + Gas Overhead)) / ETH per LINK
```

- Callback Gas: Gas limit set for your fulfillment function
- Gas Overhead: Standard Chainlink Functions overhead (~185,000 gas)
- ETH per LINK: Conversion rate from LINK/ETH feed

2. **Premium Fee**:

```
Premium Fee (LINK) = USD Fee / LINK/USD Price
```

- Fixed USD-denominated fee (e.g., $3.20 per request)
- Converted to LINK using LINK/USD feed

3. **Total Cost (LINK)**:

```
Total Request Cost (LINK) = Gas Cost (LINK) + Premium Fee (LINK)
```

4. **Total Cost in ETH**:

```
Total Cost (ETH) = Total Request Cost (LINK) * ETH per LINK
```

---

## 2️⃣ Example Estimation for Oracle Callback

Assumptions:

- Callback Gas: 200,000
- Gas Overhead: 185,000
- Gas Price: 1.5 gwei
- LINK/USD Price: $20
- ETH/USD Price: $4,500
- ETH per LINK = 20 / 4500 ≈ 0.004444 ETH/LINK

### Step 1: Calculate Total Gas Cost (ETH)

```
Total Gas = Gas Price * (Callback Gas + Gas Overhead)
          = 1.5 gwei * (200,000 + 185,000)
          = 577,500 gwei = 0.0005775 ETH
```

---

### Step 2: Convert Gas Cost to LINK

```
Gas Cost (LINK) = Total Gas / ETH per LINK
                = 0.0005775 / 0.004444
                ≈ 0.13 LINK
```

---

### Step 3: Add Premium Fee

```
Premium Fee (LINK) = USD Fee / LINK/USD Price
                   = 3.20 / 20
                   = 0.16 LINK

Total Request Cost (LINK) = Gas Cost + Premium Fee
                          = 0.13 + 0.16
                          = 0.29 LINK
```

---

### Step 4: Convert Total Cost to ETH

```
Total Request Cost (ETH) = Total Request Cost (LINK) * ETH per LINK
                          = 0.29 * 0.004444
                          ≈ 0.00129 ETH
```

---

## 3️⃣ Summary Table

| Parameter             | Value         |
| --------------------- | ------------- |
| Callback Gas          | 200,000       |
| Gas Overhead          | 185,000       |
| Gas Price             | 1.5 gwei      |
| Total Gas (ETH)       | 0.0005775 ETH |
| Gas Cost (LINK)       | 0.13 LINK     |
| Premium Fee (LINK)    | 0.16 LINK     |
| **Total Cost (LINK)** | 0.29 LINK     |
| **Total Cost (ETH)**  | 0.00129 ETH   |

---

> ⚠️ Notes:
>
> - Estimate per oracle callback.
> - Actual cost may vary slightly due to gas fluctuations and price feed changes.
> - For multiple sources or frequent updates, multiply by number of callbacks per day.

---
