import express, { Request, Response } from "express";
import Product from "../models/Product.js";
import mongoose from "mongoose";
import Site from "../models/Site.js";
import Employee from "../models/Employee.js";
import { Vendor } from "../models/Vendor.js";

const router = express.Router();

// GET /api/debug - Debug endpoint to check database status
router.get("/debug", async (req: Request, res: Response) => {
  try {
    console.log("🔍 [DEBUG] GET /api/debug called");
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    const stats = {
      mongodb: {
        connectionState: mongoose.connection.readyState,
        stateDescription: 
          mongoose.connection.readyState === 0 ? "disconnected" :
          mongoose.connection.readyState === 1 ? "connected" :
          mongoose.connection.readyState === 2 ? "connecting" :
          mongoose.connection.readyState === 3 ? "disconnecting" : "unknown",
        dbName: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        collections: collectionNames,
      },
      counts: {
        vendors: await Vendor.countDocuments(),
        products: await Product.countDocuments(),
        sites: await Site.countDocuments(),
        employees: await Employee.countDocuments(),
      },
      sampleData: {
        vendors: await Vendor.find().limit(2),
        products: await Product.find().limit(2),
        sites: await Site.find().limit(2),
        employees: await Employee.find().limit(2),
      }
    };
    
    console.log("🔍 [DEBUG] Database stats:", stats);
    res.json(stats);
  } catch (error) {
    console.error("❌ [DEBUG] Error in debug endpoint:", error);
    res.status(500).json({ 
      error: "Debug failed", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// GET /api/products - Fetch products with filters
router.get("/products", async (req: Request, res: Response) => {
  try {
    console.log("🟡 [DEBUG] GET /api/products called");
    console.log("🟡 [DEBUG] Query params:", req.query);
    
    const {
      department,
      category,
      site,
      search,
      page = "1",
      limit = "50",
    } = req.query;

    // Build query
    const query: any = {};

    if (department && department !== "all") {
      query.department = department;
    }

    if (category && category !== "all") {
      query.category = category;
    }

    if (site && site !== "all") {
      query.site = site;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    console.log("🟡 [DEBUG] MongoDB query:", JSON.stringify(query));

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Execute queries
    const [products, total] = await Promise.all([
      Product.find(query)
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 })
        .lean(),
      Product.countDocuments(query),
    ]);

    console.log(`🟢 [DEBUG] Found ${products.length} products (total: ${total})`);
    
    // If no products, return some sample data
    if (products.length === 0) {
      console.log("🟡 [DEBUG] No products found, returning sample data");
      
      const sampleProducts = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: "Sample Cleaning Machine",
          category: "Machines",
          department: "housekeeping",
          quantity: 5,
          price: 25000,
          costPrice: 20000,
          status: "in-stock",
          sku: "HOU-MAC-SAMPLE",
          site: "site-001",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: "Sample CCTV Camera",
          category: "Equipment",
          department: "security",
          quantity: 10,
          price: 8000,
          costPrice: 6000,
          status: "in-stock",
          sku: "SEC-EQU-SAMPLE",
          site: "site-002",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      return res.json({
        products: sampleProducts,
        total: sampleProducts.length,
        page: pageNum,
        totalPages: 1,
        message: "Sample data - No products in database"
      });
    }
    
    res.json({
      products,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error: any) {
    console.error("❌ [DEBUG] Error fetching products:", error);
    console.error("❌ [DEBUG] Error stack:", error.stack);
    
    res.status(500).json({ 
      error: "Failed to fetch products",
      message: error.message,
      details: error.toString()
    });
  }
});

// POST /api/products - Create new product
router.post("/products", async (req: Request, res: Response) => {
  try {
    console.log("📦 [DEBUG] Received POST /products request");
    console.log("📦 [DEBUG] Request body:", JSON.stringify(req.body, null, 2));

    const productData = req.body;

    // Log all fields
    console.log("📦 [DEBUG] Product data fields:");
    Object.keys(productData).forEach((key) => {
      console.log(
        `  ${key}: ${productData[key]} (type: ${typeof productData[key]})`
      );
    });

    // Convert number fields
    if (productData.quantity)
      productData.quantity = Number(productData.quantity);
    if (productData.price) productData.price = Number(productData.price);
    if (productData.costPrice)
      productData.costPrice = Number(productData.costPrice);
    if (productData.reorderLevel)
      productData.reorderLevel = Number(productData.reorderLevel);
    if (productData.brushCount)
      productData.brushCount = Number(productData.brushCount);
    if (productData.squeegeeCount)
      productData.squeegeeCount = Number(productData.squeegeeCount);

    // Generate SKU if not provided
    if (!productData.sku) {
      const timestamp = Date.now();
      productData.sku = `SKU-${timestamp}`;
    }

    // Set default status based on quantity
    if (!productData.status) {
      productData.status = productData.quantity > (productData.reorderLevel || 0) 
        ? "in-stock" 
        : productData.quantity > 0 
          ? "low-stock" 
          : "out-of-stock";
    }

    console.log("📦 [DEBUG] After conversion:", productData);

    // Create and save product
    const product = new Product(productData);
    console.log("📦 [DEBUG] Mongoose product object created");

    await product.save();
    console.log("✅ [DEBUG] Product saved to MongoDB:", product._id);

    res.status(201).json(product);
  } catch (error: any) {
    console.error("❌ [DEBUG] ERROR in POST /products:");
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    console.error("❌ Full error:", error);

    // Mongoose validation error details
    if (error.name === "ValidationError") {
      console.error("❌ Validation errors:");
      Object.keys(error.errors).forEach((key) => {
        console.error(`  ${key}: ${error.errors[key].message}`);
      });
    }

    res.status(500).json({
      error: "Failed to create product",
      details: error instanceof Error ? error.message : String(error),
      errorName: error.name,
    });
  }
});

// DELETE /api/products/:id - Delete product
router.delete("/products/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log("🗑️ [DEBUG] DELETE /products/:id called with id:", id);

    // Check if valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log("❌ [DEBUG] Invalid ObjectId format:", id);
      return res.status(400).json({ error: "Invalid product ID format" });
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      console.log("❌ [DEBUG] Product not found with id:", id);
      return res.status(404).json({ error: "Product not found" });
    }

    console.log("✅ [DEBUG] Product deleted:", id);
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("❌ [DEBUG] Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product", details: error instanceof Error ? error.message : String(error) });
  }
});

// POST /api/products/:id/change-history - Add change history
router.post(
  "/products/:id/change-history",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const changeData = req.body;
      
      console.log("📝 [DEBUG] POST /products/:id/change-history called");
      console.log("📝 [DEBUG] Product ID:", id);
      console.log("📝 [DEBUG] Change data:", changeData);

      // Check if valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid product ID" });
      }

      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Add the change history
      product.changeHistory.push(changeData);
      await product.save();

      console.log("✅ [DEBUG] Change history added to product:", id);
      res.json(changeData);
    } catch (error) {
      console.error("❌ [DEBUG] Error adding change history:", error);
      res.status(500).json({ error: "Failed to add change history", details: error instanceof Error ? error.message : String(error) });
    }
  }
);

// GET /api/vendors - Get vendors
router.get("/vendors", async (req: Request, res: Response) => {
  try {
    console.log("🏢 [DEBUG] GET /api/vendors called");
    console.log("🏢 [DEBUG] MongoDB connection state:", mongoose.connection.readyState);
    
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.log("🔴 [DEBUG] MongoDB not connected!");
      return res.status(500).json({ 
        error: "MongoDB not connected",
        connectionState: mongoose.connection.readyState,
        message: "Please check if MongoDB is running"
      });
    }
    
    const vendors = await Vendor.find().sort({ name: 1 }).lean();
    console.log(`🟢 [DEBUG] Found ${vendors.length} vendors`);
    
    // If no vendors, return sample data
    if (vendors.length === 0) {
      console.log("🟡 [DEBUG] No vendors found, returning sample data");
      
      const sampleVendors = [
        {
          _id: new mongoose.Types.ObjectId(),
          id: "sample-vendor-001",
          name: "CleanTech Solutions",
          category: "Cleaning Equipment",
          contactPerson: "Sample Contact",
          phone: "9876543210",
          city: "Mumbai",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: new mongoose.Types.ObjectId(),
          id: "sample-vendor-002",
          name: "SecurePro Systems",
          category: "Security Equipment",
          contactPerson: "Another Contact",
          phone: "9876543211",
          city: "Delhi",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      return res.json(sampleVendors);
    }
    
    res.json(vendors);
  } catch (error: any) {
    console.error("❌ [DEBUG] Error fetching vendors:", error);
    console.error("❌ [DEBUG] Error stack:", error.stack);
    
    // Return sample data on error
    const fallbackVendors = [
      {
        _id: "fallback-vendor-001",
        id: "fallback-001",
        name: "Fallback Vendor 1",
        category: "General Supplier",
        contactPerson: "Fallback Contact",
        phone: "0000000001",
        city: "Fallback City",
        status: "active"
      },
      {
        _id: "fallback-vendor-002",
        id: "fallback-002",
        name: "Fallback Vendor 2",
        category: "Service Provider",
        contactPerson: "Fallback Contact 2",
        phone: "0000000002",
        city: "Fallback City 2",
        status: "active"
      }
    ];
    
    res.json(fallbackVendors);
  }
});

// GET /api/sites - Get sites from MongoDB
router.get("/sites", async (req: Request, res: Response) => {
  try {
    console.log("📍 [DEBUG] GET /api/sites called");
    
    const sites = await Site.find().sort({ name: 1 }).lean();
    console.log(`🟢 [DEBUG] Found ${sites.length} sites`);
    
    // If no sites, return sample data
    if (sites.length === 0) {
      console.log("🟡 [DEBUG] No sites found, returning sample data");
      
      const sampleSites = [
        {
          _id: new mongoose.Types.ObjectId(),
          id: "sample-site-001",
          name: "Corporate Office",
          location: "123 Business Street",
          city: "Mumbai",
          status: "active",
          manager: "Sample Manager",
          totalEmployees: 50,
          contact: "022-12345678"
        },
        {
          _id: new mongoose.Types.ObjectId(),
          id: "sample-site-002",
          name: "Tech Park",
          location: "456 Tech Avenue",
          city: "Bangalore",
          status: "active",
          manager: "Tech Manager",
          totalEmployees: 100,
          contact: "080-87654321"
        }
      ];
      
      return res.json(sampleSites);
    }
    
    res.json(sites);
  } catch (error) {
    console.error("❌ [DEBUG] Error fetching sites:", error);
    
    // Return sample data on error
    const fallbackSites = [
      {
        _id: "fallback-site-001",
        id: "fallback-001",
        name: "Fallback Site 1",
        location: "Fallback Location",
        city: "Fallback City",
        status: "active",
        manager: "Fallback Manager",
        totalEmployees: 25,
        contact: "000-0000000"
      }
    ];
    
    res.json(fallbackSites);
  }
});

// GET /api/employees - Get employees
router.get("/employees", async (req: Request, res: Response) => {
  try {
    console.log("👥 [DEBUG] GET /api/employees called");
    
    const employees = await Employee.find().sort({ name: 1 }).lean();
    console.log(`🟢 [DEBUG] Found ${employees.length} employees`);
    
    // If no employees, return sample data
    if (employees.length === 0) {
      console.log("🟡 [DEBUG] No employees found, returning sample data");
      
      const sampleEmployees = [
        {
          _id: new mongoose.Types.ObjectId(),
          id: "sample-emp-001",
          name: "John Doe",
          role: "Site Manager",
          phone: "9876543201",
          site: "sample-site-001",
          status: "active",
          salary: 50000
        },
        {
          _id: new mongoose.Types.ObjectId(),
          id: "sample-emp-002",
          name: "Jane Smith",
          role: "Supervisor",
          phone: "9876543202",
          site: "sample-site-002",
          status: "active",
          salary: 40000
        }
      ];
      
      return res.json(sampleEmployees);
    }
    
    res.json(employees);
  } catch (error) {
    console.error("❌ [DEBUG] Error fetching employees:", error);
    
    // Return sample data on error
    const fallbackEmployees = [
      {
        _id: "fallback-emp-001",
        id: "fallback-001",
        name: "Fallback Employee",
        role: "Staff",
        phone: "0000000000",
        site: "fallback-site-001",
        status: "active",
        salary: 30000
      }
    ];
    
    res.json(fallbackEmployees);
  }
});

// GET /api/departments - Get departments
router.get("/departments", (req: Request, res: Response) => {
  console.log("🏢 [DEBUG] GET /api/departments called");
  
  const departments = [
    { _id: "1", value: "housekeeping", label: "🧼 Housekeeping Management", icon: "Home" },
    { _id: "2", value: "security", label: "🛡️ Security Management", icon: "Shield" },
    { _id: "3", value: "parking", label: "🚗 Parking Management", icon: "Car" },
    { _id: "4", value: "waste", label: "♻️ Waste Management", icon: "Trash" },
    { _id: "5", value: "stp", label: "🏭 STP Tank Cleaning", icon: "Droplets" },
    { _id: "6", value: "consumables", label: "🛒 Consumables", icon: "ShoppingBasket" },
  ];
  
  res.json(departments);
});

// GET /api/department-categories - Get department categories
router.get("/department-categories", (req: Request, res: Response) => {
  console.log("📂 [DEBUG] GET /api/department-categories called");
  console.log("📂 [DEBUG] Query params:", req.query);
  
  const { department } = req.query;

  const departmentCategoriesData = {
    housekeeping: {
      Machines: [
        "Single disc machine",
        "Auto scrubber dryer (walk-behind / ride-on)",
        "Wet & dry vacuum cleaner",
        "Carpet extraction machine",
        "High pressure jet machine",
        "Steam cleaner",
        "Floor polisher / burnisher",
      ],
      "Tools & Material": [
        "Mop (dry & wet)",
        "Mop wringer trolley",
        "Bucket & squeezer",
        "Microfiber cloths",
        "Dusters",
        "Brooms & brushes",
        "Floor squeegee",
        "Cobweb brush",
        "Window cleaning kit (squeegee + washer)",
        "Spray bottles",
        "Garbage bins (Indoor/Outdoor)",
        "Scrubbing pads & sponge scrubs",
        "Dustpan set",
        "Cleaning trolley",
      ],
      "Chemicals & Consumables": [
        "Floor cleaner",
        "Toilet cleaner",
        "Glass cleaner",
        "Carpet shampoo",
        "Disinfectant (bleach / hypo / bio enzyme)",
        "Hand wash liquid",
        "Air freshener",
        "Garbage bags",
        "Tissue papers",
      ],
      PPE: ["Gloves", "Apron", "Mask", "Shoes"],
    },
    security: {
      Equipment: [
        "CCTV Cameras (IP/HD)",
        "NVR/DVR",
        "Gate metal detector",
        "Handheld metal detector",
        "Walkie-talkies",
        "Biometric attendance machine",
        "RFID cards & access control system",
        "Boom barrier (if gate management)",
        "Torch / rechargeable flashlight",
        "Guard patrol device",
        "Under-vehicle inspection mirror",
        "Body camera (optional)",
      ],
      "Tools & Safety": [
        "Barricades / caution tape",
        "Traffic cones",
        "Emergency whistle",
        "First aid kit",
      ],
      "Uniform & Accessories": [
        "Security uniforms",
        "Cap, belt, shoes",
        "ID cards",
        "Lanyard",
      ],
      Registers: [
        "Visitor logbook",
        "Material In/Out register",
        "Key register",
        "Incident log book",
        "Vehicle entry register",
      ],
    },
    parking: {
      Equipment: [
        "Boom barrier",
        "Ticket machine / QR system",
        "RFID scanner",
        "ANPR camera (optional)",
        "Traffic cones",
        "Wheel stoppers",
        "Safety barricades",
        "Speed breakers",
        "Traffic baton (light stick)",
        "Walkie-talkies",
      ],
      "Signage & Marking": [
        "Entry/Exit signboards",
        "Parking zone boards",
        "Direction arrow boards",
        "Number plates for slots",
        "Paint for floor marking",
      ],
      "Registers / Digital Logs": [
        "Visitor vehicle register",
        "Parking pass register",
      ],
      "Uniform & Safety": [
        "Parking uniform/Jacket",
        "Whistle",
        "Reflective vest",
      ],
    },
    waste: {
      "Bins & Storage": [
        "Color-coded bins (Dry/Wet/Bio/Plastic/Glass)",
        "Collection trolleys",
        "Big waste collection drums",
        "Wheelbarrow / push cart",
      ],
      Tools: [
        "Shovel",
        "Garbage lifter",
        "Tongs",
        "Rake",
        "Disinfectant sprayer",
        "Broom & mops",
      ],
      Equipment: [
        "Waste compactor (if large facility)",
        "Garbage lifter/loader machine (industrial)",
      ],
      Consumables: [
        "Garbage bags",
        "Disinfectant chemical",
        "Gloves / PPE",
        "Mask / face shield",
      ],
    },
    stp: {
      "Machines & Tools": [
        "Submersible pump",
        "Jetting machine",
        "Sludge suction pump",
        "Desludging tanker (external vendor)",
        "Scraper rods",
        "High-pressure washer",
      ],
      "Safety Equipment": [
        "Full body safety harness",
        "Tripod & rope set",
        "Ventilation blower",
        "Gas detector (H2S, methane)",
        "Oxygen cylinder (for confined entry)",
        "First aid kit",
      ],
      PPE: [
        "Chemical-resistant gloves",
        "Gumboots",
        "Safety goggles",
        "Helmet",
        "Respirator mask / SCBA (Self-Contained Breathing Device)",
      ],
    },
    consumables: {
      "Office Supplies": [
        "Pens & Stationery",
        "Notepads & Registers",
        "Printing Paper",
        "Toner & Cartridges",
      ],
      "Maintenance Items": [
        "Lubricants & Oils",
        "Spare Parts",
        "Tools & Equipment",
      ],
      "Safety Equipment": [
        "First Aid Kits",
        "Fire Extinguishers",
        "Safety Signage",
      ],
    },
  };

  // Convert to array format
  const categoriesArray = [];

  for (const [dept, categories] of Object.entries(departmentCategoriesData)) {
    for (const [category, items] of Object.entries(categories)) {
      categoriesArray.push({
        _id: `${dept}-${category}`.replace(/\s+/g, "-").toLowerCase(),
        department: dept,
        category: category,
        items: items,
      });
    }
  }

  // Filter by department if specified
  const filtered = department
    ? categoriesArray.filter((dc) => dc.department === department)
    : categoriesArray;

  console.log(`📂 [DEBUG] Returning ${filtered.length} categories`);
  res.json(filtered);
});

// GET /api/machine-stats - Calculate machine statistics from DB
router.get("/machine-stats", async (req: Request, res: Response) => {
  try {
    console.log("📊 [DEBUG] GET /api/machine-stats called");
    
    // Aggregate products to get machine statistics
    const stats = await Product.aggregate([
      {
        $match: {
          department: "housekeeping",
          category: "Machines",
        },
      },
      {
        $group: {
          _id: "$site",
          siteId: { $first: "$site" },
          machineCount: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalCost: {
            $sum: {
              $multiply: ["$costPrice", "$quantity"],
            },
          },
          totalBrushes: { $sum: "$brushCount" },
          totalSqueegees: { $sum: "$squeegeeCount" },
          totalChanges: {
            $sum: { $size: "$changeHistory" },
          },
        },
      },
      {
        $lookup: {
          from: "sites",
          localField: "siteId",
          foreignField: "id",
          as: "siteInfo",
        },
      },
      {
        $addFields: {
          siteName: {
            $ifNull: [{ $arrayElemAt: ["$siteInfo.name", 0] }, "$siteId"],
          },
          manager: {
            $ifNull: [{ $arrayElemAt: ["$siteInfo.manager", 0] }, "Unknown"],
          },
        },
      },
      {
        $project: {
          siteInfo: 0,
        },
      },
    ]);

    console.log(`📊 [DEBUG] Found ${stats.length} machine stats entries`);
    res.json(stats);
  } catch (error) {
    console.error("❌ [DEBUG] Error fetching machine stats:", error);
    res.status(500).json({ error: "Failed to fetch machine statistics", details: error instanceof Error ? error.message : String(error) });
  }
});

export default router;