// prisma/seed.ts — Seed script with realistic data
// Author: Sudarshan Sonawane

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Clean existing data ──────────────────────────
  await prisma.stockMovement.deleteMany();
  await prisma.receiveIdempotency.deleteMany();
  await prisma.pOLineItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.supplierProduct.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();

  // ─── Suppliers ────────────────────────────────────
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: "Acme Industrial Supplies",
        email: "orders@acme-industrial.com",
        phone: "+1-555-0100",
        address: "123 Industrial Blvd, Chicago, IL 60601",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "GlobalTech Components",
        email: "sales@globaltech-comp.com",
        phone: "+1-555-0101",
        address: "456 Innovation Drive, San Jose, CA 95101",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Precision Parts Co.",
        email: "info@precision-parts.com",
        phone: "+1-555-0102",
        address: "789 Manufacturing Row, Detroit, MI 48201",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Quality Hardware Distributors",
        email: "sales@qhd.com",
        phone: "+1-555-0103",
        address: "321 Supply Chain Ave, Dallas, TX 75201",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Eco Materials Ltd.",
        email: "hello@ecomaterials.com",
        phone: "+1-555-0104",
        address: "555 Green Way, Portland, OR 97201",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Northern Steel & Metals",
        email: "orders@northernsteel.com",
        phone: "+1-555-0105",
        address: "1000 Foundry Street, Pittsburgh, PA 15201",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Pacific Rim Electronics",
        email: "support@pacificrim-elec.com",
        phone: "+1-555-0106",
        address: "2000 Tech Park Way, Seattle, WA 98101",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Midwest Packaging Solutions",
        email: "info@midwest-pack.com",
        phone: "+1-555-0107",
        address: "750 Container Road, St. Louis, MO 63101",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Advanced Automation Inc.",
        email: "sales@adv-auto.com",
        phone: "+1-555-0108",
        address: "1500 Robotics Lane, Boston, MA 02101",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Reliable Raw Materials",
        email: "contact@reliable-raw.com",
        phone: "+1-555-0109",
        address: "50 Resource Drive, Denver, CO 80201",
      },
    }),
  ]);

  console.log(`  ✓ ${suppliers.length} suppliers created`);

  // ─── Products ─────────────────────────────────────
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: "BOLT-SS-M8",
        name: "Stainless Steel Bolt M8",
        description: "Grade 316 stainless steel bolt, M8 thread, 30mm length",
        currentStock: 1500,
        reorderLevel: 500,
      },
    }),
    prisma.product.create({
      data: {
        sku: "NUT-HEX-M8",
        name: "Hex Nut M8",
        description: "Grade 8 zinc-plated hex nut, M8 thread",
        currentStock: 3000,
        reorderLevel: 1000,
      },
    }),
    prisma.product.create({
      data: {
        sku: "WASH-FL-M8",
        name: "Flat Washer M8",
        description: "Standard flat washer, M8 size, zinc-plated",
        currentStock: 5000,
        reorderLevel: 2000,
      },
    }),
    prisma.product.create({
      data: {
        sku: "SEAL-RUB-001",
        name: "Rubber Seal Strip 1m",
        description: "EPDM rubber seal strip, 1 meter length, 10mm width",
        currentStock: 800,
        reorderLevel: 300,
      },
    }),
    prisma.product.create({
      data: {
        sku: "BEAR-6205",
        name: "Ball Bearing 6205",
        description: "Deep groove ball bearing, 6205 series, 25x52x15mm",
        currentStock: 250,
        reorderLevel: 100,
      },
    }),
    prisma.product.create({
      data: {
        sku: "SPRI-COMP-50",
        name: "Compression Spring 50mm",
        description: "Steel compression spring, 50mm length, 20mm diameter",
        currentStock: 1200,
        reorderLevel: 400,
      },
    }),
    prisma.product.create({
      data: {
        sku: "GEAR-SPUR-20",
        name: "Spur Gear 20 Teeth",
        description: "Steel spur gear, module 2, 20 teeth, 40mm outer diameter",
        currentStock: 180,
        reorderLevel: 75,
      },
    }),
    prisma.product.create({
      data: {
        sku: "HYDRA-HOSE-1M",
        name: "Hydraulic Hose 1m",
        description: "High-pressure hydraulic hose, 1/2 inch bore, 1 meter length",
        currentStock: 90,
        reorderLevel: 50,
      },
    }),
    prisma.product.create({
      data: {
        sku: "SENSOR-PROX-001",
        name: "Proximity Sensor Inductive",
        description: "Inductive proximity sensor, M12, 8mm sensing range, PNP",
        currentStock: 45,
        reorderLevel: 25,
      },
    }),
    prisma.product.create({
      data: {
        sku: "MOTOR-STEP-57",
        name: "Stepper Motor NEMA23",
        description: "NEMA23 stepper motor, 2.8A, 3.0Nm holding torque",
        currentStock: 25,
        reorderLevel: 15,
      },
    }),
    prisma.product.create({
      data: {
        sku: "CABLE-CAT6-3M",
        name: "CAT6 Ethernet Cable 3m",
        description: "CAT6 shielded Ethernet cable, 3 meters, RJ45 connectors",
        currentStock: 600,
        reorderLevel: 200,
      },
    }),
    prisma.product.create({
      data: {
        sku: "VALVE-SOL-24V",
        name: "Solenoid Valve 24V DC",
        description: "5/2 way solenoid valve, 24V DC, 1/4 inch ports",
        currentStock: 35,
        reorderLevel: 20,
      },
    }),
    prisma.product.create({
      data: {
        sku: "FILTER-AIR-001",
        name: "Air Filter Element",
        description: "Compressed air filter element, 5 micron, 1/2 inch connections",
        currentStock: 120,
        reorderLevel: 60,
      },
    }),
    prisma.product.create({
      data: {
        sku: "COUPL-FLEX-20",
        name: "Flexible Coupling 20mm",
        description: "Aluminum flexible coupling, 20mm bore, 30mm outer diameter",
        currentStock: 5,
        reorderLevel: 30,
      },
    }),
    prisma.product.create({
      data: {
        sku: "CONTROL-PLC-001",
        name: "PLC Controller Basic",
        description: "Basic programmable logic controller, 16 I/O, RS485",
        currentStock: 12,
        reorderLevel: 10,
      },
    }),
    prisma.product.create({
      data: {
        sku: "WIRE-AWG14-100M",
        name: "Electrical Wire AWG14 100m",
        description: "AWG14 stranded copper wire, 100 meter roll, PVC insulation",
        currentStock: 8,
        reorderLevel: 5,
      },
    }),
    prisma.product.create({
      data: {
        sku: "FUSE-5A-QUICK",
        name: "Quick Blow Fuse 5A",
        description: "5 amp quick-blow glass fuse, 5x20mm, 250V",
        currentStock: 2000,
        reorderLevel: 500,
      },
    }),
    prisma.product.create({
      data: {
        sku: "LED-PNL-600x600",
        name: "LED Panel Light 600x600mm",
        description: "LED panel light, 600x600mm, 40W, 4000K neutral white",
        currentStock: 60,
        reorderLevel: 25,
      },
    }),
    prisma.product.create({
      data: {
        sku: "SWITCH-LIMIT-001",
        name: "Limit Switch Roller",
        description: "Roller style limit switch, SPDT, 10A, 250VAC",
        currentStock: 3,
        reorderLevel: 20,
      },
    }),
    prisma.product.create({
      data: {
        sku: "PUMP-GEAR-001",
        name: "Gear Pump 10L/min",
        description: "External gear pump, 10L/min, 20 bar max, cast iron body",
        currentStock: 15,
        reorderLevel: 10,
      },
    }),
  ]);

  console.log(`  ✓ ${products.length} products created`);

  // ─── Link products to suppliers ───────────────────
  const linkData = [
    { supplier: 0, product: 0, price: 45, sku: "ACM-BOLT-M8", leadTime: 5 },
    { supplier: 0, product: 1, price: 18, sku: "ACM-NUT-M8", leadTime: 5 },
    { supplier: 0, product: 2, price: 8, sku: "ACM-WASH-M8", leadTime: 5 },
    { supplier: 1, product: 3, price: 125, sku: "GTC-SEAL-001", leadTime: 10 },
    { supplier: 1, product: 4, price: 340, sku: "GTC-BEAR-6205", leadTime: 14 },
    { supplier: 1, product: 5, price: 280, sku: "GTC-SPRI-50", leadTime: 10 },
    { supplier: 2, product: 6, price: 4500, sku: "PPC-GEAR-20T", leadTime: 21 },
    { supplier: 2, product: 7, price: 1890, sku: "PPC-HOSE-1M", leadTime: 14 },
    { supplier: 2, product: 8, price: 3200, sku: "PPC-SENS-PROX", leadTime: 10 },
    { supplier: 3, product: 0, price: 42, sku: "QHD-BOLT-M8", leadTime: 7 },
    { supplier: 3, product: 1, price: 15, sku: "QHD-NUT-M8", leadTime: 7 },
    { supplier: 3, product: 9, price: 18000, sku: "QHD-MOTOR-STEP", leadTime: 21 },
    { supplier: 4, product: 10, price: 350, sku: "ECO-CAT6-3M", leadTime: 7 },
    { supplier: 4, product: 3, price: 110, sku: "ECO-SEAL-001", leadTime: 10 },
    { supplier: 5, product: 11, price: 4200, sku: "NSM-VALVE-SOL", leadTime: 14 },
    { supplier: 5, product: 12, price: 1850, sku: "NSM-FILTER-AIR", leadTime: 10 },
    { supplier: 5, product: 7, price: 1750, sku: "NSM-HOSE-1M", leadTime: 14 },
    { supplier: 6, product: 13, price: 2800, sku: "PRE-COUPL-20", leadTime: 14 },
    { supplier: 6, product: 14, price: 45000, sku: "PRE-PLC-BASIC", leadTime: 30 },
    { supplier: 6, product: 8, price: 2950, sku: "PRE-SENS-PROX", leadTime: 10 },
    { supplier: 7, product: 15, price: 3800, sku: "MPS-WIRE-14", leadTime: 7 },
    { supplier: 7, product: 16, price: 25, sku: "MPS-FUSE-5A", leadTime: 5 },
    { supplier: 7, product: 10, price: 320, sku: "MPS-CAT6-3M", leadTime: 5 },
    { supplier: 8, product: 17, price: 15900, sku: "AAI-LED-PANEL", leadTime: 14 },
    { supplier: 8, product: 18, price: 1800, sku: "AAI-LIMIT-SW", leadTime: 10 },
    { supplier: 8, product: 14, price: 48500, sku: "AAI-PLC-BASIC", leadTime: 21 },
    { supplier: 9, product: 19, price: 28500, sku: "RRM-PUMP-GEAR", leadTime: 21 },
    { supplier: 9, product: 5, price: 260, sku: "RRM-SPRI-50", leadTime: 10 },
    { supplier: 9, product: 12, price: 1700, sku: "RRM-FILTER-AIR", leadTime: 10 },
  ];

  for (const link of linkData) {
    const preferred = ["ACM-BOLT-M8", "GTC-BEAR-6205", "PPC-GEAR-20T", "NSM-VALVE-SOL", "AAI-PLC-BASIC"].includes(link.sku);
    await prisma.supplierProduct.create({
      data: {
        supplierId: suppliers[link.supplier].id,
        productId: products[link.product].id,
        supplierSku: link.sku,
        currentPriceCents: BigInt(link.price),
        leadTimeDays: link.leadTime,
        isPreferred: preferred,
      },
    });
  }

  console.log(`  ✓ ${linkData.length} supplier-product links created`);

  // ─── Sample Purchase Orders ───────────────────────
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);
  const yesterday = new Date(now.getTime() - 86400000);

  // DRAFT PO
  const po1 = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2025-0001",
      supplierId: suppliers[0].id,
      status: "DRAFT",
      notes: "Regular monthly restock of fasteners",
    },
  });

  await prisma.pOLineItem.create({
    data: {
      purchaseOrderId: po1.id,
      productId: products[0].id,
      quantity: 200,
      unitPriceCents: BigInt(42),
      lineTotalCents: BigInt(42 * 200),
    },
  });

  await prisma.pOLineItem.create({
    data: {
      purchaseOrderId: po1.id,
      productId: products[1].id,
      quantity: 500,
      unitPriceCents: BigInt(15),
      lineTotalCents: BigInt(15 * 500),
    },
  });

  await prisma.purchaseOrder.update({
    where: { id: po1.id },
    data: { totalCents: BigInt(42 * 200 + 15 * 500) },
  });

  // PLACED PO
  const po2 = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2025-0002",
      supplierId: suppliers[1].id,
      status: "PLACED",
      placedAt: twoDaysAgo,
      notes: "Bearing and seal replacement stock",
    },
  });

  await prisma.pOLineItem.create({
    data: {
      purchaseOrderId: po2.id,
      productId: products[4].id,
      quantity: 50,
      unitPriceCents: BigInt(340),
      lineTotalCents: BigInt(340 * 50),
    },
  });

  await prisma.pOLineItem.create({
    data: {
      purchaseOrderId: po2.id,
      productId: products[3].id,
      quantity: 100,
      unitPriceCents: BigInt(125),
      lineTotalCents: BigInt(125 * 100),
    },
  });

  await prisma.purchaseOrder.update({
    where: { id: po2.id },
    data: { totalCents: BigInt(340 * 50 + 125 * 100) },
  });

  // RECEIVED PO
  const po3 = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2025-0003",
      supplierId: suppliers[2].id,
      status: "RECEIVED",
      placedAt: threeDaysAgo,
      receivedAt: yesterday,
      notes: "Sensor and component restock - received in full",
    },
  });

  await prisma.pOLineItem.create({
    data: {
      purchaseOrderId: po3.id,
      productId: products[8].id,
      quantity: 20,
      unitPriceCents: BigInt(3200),
      lineTotalCents: BigInt(3200 * 20),
    },
  });

  await prisma.pOLineItem.create({
    data: {
      purchaseOrderId: po3.id,
      productId: products[6].id,
      quantity: 10,
      unitPriceCents: BigInt(4500),
      lineTotalCents: BigInt(4500 * 10),
    },
  });

  await prisma.purchaseOrder.update({
    where: { id: po3.id },
    data: { totalCents: BigInt(3200 * 20 + 4500 * 10) },
  });

  // Stock movements for received PO
  await prisma.stockMovement.create({
    data: {
      productId: products[8].id,
      purchaseOrderId: po3.id,
      delta: 20,
      balanceAfter: 65, // was 45, received 20
      reason: "RECEIVE_PO",
    },
  });

  await createInitialStockMovements(products);

  console.log(`  ✓ 3 sample purchase orders created`);
  console.log(`\n✅ Seeding complete!`);
}

// Helper: Create initial stock movements for all products
async function createInitialStockMovements(products: any[]) {
  for (const product of products) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        delta: product.currentStock,
        balanceAfter: product.currentStock,
        reason: "ADJUSTMENT_INITIAL",
      },
    }).catch(() => {
      // Skip if already exists (idempotency)
    });
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
