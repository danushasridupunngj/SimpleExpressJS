const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json()); // To handle JSON payloads

// Database connection
const db = mysql.createPool({
  host: "203.161.41.165",
  user: "danusha_stock",
  password: "Supun878@96",
  database: "danusha_stock",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

//Production Set 
app.get("/api/raw-materials-for-production", (req, res) => {
  db.query("SELECT `raw_materials`.`id` AS raw_id, `raw_materials`.`name` AS raw_name, `po_item`.`p_price` FROM `raw_materials` INNER JOIN `po_item` ON `raw_materials`.`id` = `po_item`.`item_id` WHERE `po_item`.`date` = ( SELECT MAX(`date`) FROM `po_item` WHERE `po_item`.`item_id` = `raw_materials`.`id` );", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.post("/api/production-set", (req, res) => {
  const { name, cost, profit,qty,sale_price,wastage, items } = req.body; // 'items' is an array of items

  // Step 1: Insert the PO into the 'po' table
  db.query(
    "INSERT INTO `production_set`(`name`, `cost`, `profit`, `qty`, `sale_price`,`wastage`) VALUES (?,?,?,?,?,?)",
    [name, cost, profit,qty,sale_price,wastage],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Get the inserted PO ID
      const po_id = results.insertId;

      // Step 2: Insert the PO items into the 'po_item' table
      const itemValues = items.map(item => [
        po_id,
        item.rawItemId,   // Assuming rawItemId corresponds to 'item_id'
        item.quantity,
        item.purchasePrice,
        item.totalPrice
      ]);

      // Insert all items in one query
      const sql = "INSERT INTO production_set_item (p_id, i_id, qty, p_price, total) VALUES ?";
      db.query(sql, [itemValues], (err, results) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Production Set created with items", po_id });
      });
    }
  );
});

app.get("/api/production-set", (req, res) => {
  db.query("SELECT * FROM production_set", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.get("/api/production-set/:id", (req, res) => {
  const { id } = req.params;

  // Query to fetch the purchase order details along with the supplier information
  db.query(
    "SELECT * FROM `production_set` WHERE `id` = ?",
    [id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      const poData = results[0];  // Assuming results[0] contains the PO data and supplier info

      // Query to fetch the items associated with the purchase order
      db.query(
        "SELECT `production_set_item`.`p_price`,`production_set_item`.`total`,`production_set_item`.`qty`,`production_set_item`.`i_id`,`raw_materials`.`name` FROM `production_set_item`,`raw_materials` WHERE `production_set_item`.`p_id`=? AND `raw_materials`.`id` = `production_set_item`.`i_id`;",
        [id],
        (err, items) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Return the purchase order data along with the associated items and supplier info
          res.json({
            po: poData,
            items: items,  // This could include raw materials, quantities, etc.
          });
        }
      );
    }
  );
});

app.put("/api/production-set/:id", (req, res) => {
  const productionSetId = req.params.id; // The ID of the production set to update
  const { name, cost, profit, qty, sale_price, wastage, items } = req.body; // Items is an array

  // Step 1: Update the production_set table
  db.query(
    `UPDATE production_set 
     SET name = ?, cost = ?, profit = ?, sale_price = ?, wastage = ? 
     WHERE id = ?`,
    [name, cost, profit, sale_price, wastage, productionSetId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Step 2: Delete existing items for the production set
      db.query(
        "DELETE FROM production_set_item WHERE p_id = ?",
        [productionSetId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Step 3: Insert the updated items into production_set_item table
          const itemValues = items.map(item => [
            productionSetId,
            item.rawItemId, // Assuming rawItemId corresponds to 'i_id'
            item.quantity,
            item.purchasePrice,
            item.totalPrice,
          ]);

          const sql =
            "INSERT INTO production_set_item (p_id, i_id, qty, p_price, total) VALUES ?";
          db.query(sql, [itemValues], (err, results) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({
              message: "Production Set and items updated successfully",
              productionSetId,
            });
          });
        }
      );
    }
  );
});


//Production Generate
app.get("/api/production-gen-items", (req, res) => {
  db.query("SELECT ps.id AS production_set_id, ps.name AS production_set_name, FLOOR(MIN(rm.qty / psi.qty)) AS max_production FROM production_set ps JOIN production_set_item psi ON ps.id = psi.p_id JOIN raw_materials rm ON psi.i_id = rm.id WHERE psi.qty > 0 AND rm.qty >= 0 GROUP BY ps.id, ps.name;", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});


app.get("/api/production-gen-stock-vehicle", (req, res) => {
  db.query("SELECT `production_set`.`id` as production_set_id,`production_set`.`name` as production_set_name,`production_set`.`qty` as max_production FROM `production_set` WHERE `qty`> 0;", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.get("/api/production-all", (req, res) => {
  db.query("SELECT `production_gen`.`date`,`production_gen`.`id`,`production_gen`.`qty`,`production_set`.`name` FROM `production_gen`,`production_set` WHERE `production_set`.`id` = `production_gen`.`p_id`;", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.post("/api/add-production", (req, res) => {
  const { productionSetId, quantity } = req.body;

  // Fetch the raw materials required for the selected production set
  db.query(
    "SELECT i_id, qty FROM production_set_item WHERE p_id = ?",
    [productionSetId],
    (err, rawMaterials) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error while fetching raw materials." });
      }

      // Fetch the wastage percentage from the production_set table
      db.query(
        "SELECT wastage FROM production_set WHERE id = ?",
        [productionSetId],
        (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Server error while fetching wastage." });
          }

          const wastagePercentage = result[0].wastage;

          // Check if sufficient raw materials are available
          let checkStockPromises = rawMaterials.map(material => {
            return new Promise((resolve, reject) => {
              db.query(
                "SELECT qty FROM raw_materials WHERE id = ?",
                [material.i_id],
                (err, stock) => {
                  if (err) {
                    reject("Error fetching stock.");
                  } else if (stock[0].qty < material.qty * quantity) {
                    reject("Insufficient raw materials for production.");
                  } else {
                    resolve(stock[0].qty);
                  }
                }
              );
            });
          });

          // Wait for all stock checks
          Promise.all(checkStockPromises)
            .then((stocks) => {
              // Deduct raw materials from stock and handle wastage
              let deductPromises = rawMaterials.map((material, index) => {
                const stock = stocks[index];
                const usedQty = material.qty * quantity;
                const wastageQty = (wastagePercentage / 100) * usedQty;
                const totalUsedQty = usedQty - wastageQty;
                console.log("Supun "+totalUsedQty);
                return new Promise((resolve, reject) => {
                  // Deduct raw materials from stock
                  db.query(
                    "UPDATE raw_materials SET qty = qty - ? WHERE id = ?",
                    [totalUsedQty, material.i_id],
                    (err) => {
                      if (err) {
                        reject("Error updating stock.");
                      } else {
                        // Insert wastage record into the wastage table
                        db.query(
                          "INSERT INTO wastage (item_id, qty, type, comments) VALUES (?, ?, ?, ?)",
                          [material.i_id, wastageQty, "in", "System Generated in Production"],
                          (err) => {
                            if (err) {
                              reject("Error inserting wastage record.");
                            } else {
                              resolve();
                            }
                          }
                        );
                      }
                    }
                  );
                });
              });

              // Wait for all stock updates and wastage inserts to complete
              Promise.all(deductPromises)
                .then(() => {
                  // Add production to the production_gen table
                  db.query(
                    "INSERT INTO production_gen (p_id, qty) VALUES (?, ?)",
                    [productionSetId, quantity],
                    (err, results) => {
                      if (err) {
                        console.error(err);
                        return res.status(500).json({ success: false, message: "Server error while adding production." });
                      }

                      // Update the production_set table to increase the quantity
                      db.query(
                        "UPDATE production_set SET qty = qty + ? WHERE id = ?",
                        [quantity, productionSetId],
                        (err) => {
                          if (err) {
                            console.error(err);
                            return res.status(500).json({ success: false, message: "Error updating production set." });
                          }

                          // Send success response
                          res.json({ success: true, message: "Production generated successfully." });
                        }
                      );
                    }
                  );
                })
                .catch((error) => {
                  console.error(error);
                  res.status(400).json({ success: false, message: error });
                });
            })
            .catch((error) => {
              console.error(error);
              res.status(400).json({ success: false, message: error });
            });
        }
      );
    }
  );
});

//Stocks
app.get("/api/in-house-stock", (req, res) => {
  db.query("SELECT * FROM `production_set`", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});


app.get("/api/vehicle_stock-push", (req, res) => {
  db.query("SELECT `vehicle_stock`.`id`,`vehicle_stock`.`p_id`,`vehicle_stock`.`qty`,`vehicle_stock`.`v_id`,`vehicle_stock`.`type`,`vehicle_stock`.`date`,`production_set`.`name` FROM `vehicle_stock`,`production_set` WHERE `production_set`.`id` = `vehicle_stock`.`p_id`;", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});



app.post("/api/transfer-vehicle-stock", (req, res) => {
  const { productionSetId, transferQty, vehicleId } = req.body;

  // Fetch the production set to check available quantity
  db.query(
    "SELECT qty FROM production_set WHERE id = ?",
    [productionSetId],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error while fetching production set." });
      }

      if (result.length === 0) {
        return res.status(400).json({ success: false, message: "Production set not found." });
      }

      const availableQty = result[0].qty;

      if (availableQty < transferQty) {
        return res
          .status(400)
          .json({ success: false, message: "Insufficient quantity in production set for transfer." });
      }

      // Start the stock transfer
      const newProductionQty = availableQty - transferQty;

      // Update the production set quantity
      db.query(
        "UPDATE production_set SET qty = ?, v_qty = v_qty + ? WHERE id = ?",
        [newProductionQty, transferQty, productionSetId],
        (err) => {
          if (err) {
            console.error(err);
            return res
              .status(500)
              .json({ success: false, message: "Server error while updating production set quantity." });
          }

          // Update the vehicle stock or insert new entry if it doesn't exist
          db.query(
            "INSERT INTO vehicle_stock (p_id, qty, v_id, type) VALUES (?, ?, ?, ?)",
            [productionSetId, transferQty, vehicleId, "In"],
            (err) => {
              if (err) {
                console.error(err);
                return res
                  .status(500)
                  .json({ success: false, message: "Server error while transferring stock to vehicle." });
              }

              // Update the vehicle's stock
              db.query(
                "UPDATE vehicle SET stock = stock + ? WHERE number = ?",
                [transferQty, vehicleId],
                (err) => {
                  if (err) {
                    console.error(err);
                    return res
                      .status(500)
                      .json({ success: false, message: "Server error while updating vehicle stock." });
                  }

                  res.json({ success: true, message: "Stock transferred successfully." });
                }
              );
            }
          );
        }
      );
    }
  );
});




//Vehicle
app.post("/api/vehicle", (req, res) => {
  const { number, name } = req.body;
  db.query(
    "INSERT INTO `vehicle`(`number`, `name`) VALUES (?,?)",
    [number, name],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Vehicle added", id: results.insertId });
    }
  );
});

//Get Vehicle
app.get("/api/vehicle", (req, res) => {
  db.query("SELECT * FROM vehicle", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});
//Get Single Vehicle 
app.get("/api/vehicle/:id", (req, res) => {
  const { id } = req.params; // Get the ID from the URL parameters
  db.query(
    "SELECT * FROM `vehicle` WHERE `number` = ?",
    [id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Raw material not found" });
      }
      res.json(results[0]); // Return the first result (should be one if the ID is unique)
    }
  );
});
//Update Vehicles
app.put("/api/vehicle/:id", (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const {number} = req.body;
  if (!name) {
    return res.status(400).json({ error: "Name  are required" });
  }
  if (!number) {
    return res.status(400).json({ error: "Number are required" });
  }
  db.query(
    "UPDATE `vehicle` SET `number`=?,`name`=? WHERE `number` = ?",
    [number, name, id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (results.affectedRows > 0) {
        res.json({ message: "Raw material updated" });
      } else {
        res.status(404).json({ message: "Raw material not found" });
      }
    }
  );
});


// Raw Materials
app.get("/api/raw-materials", (req, res) => {
  db.query("SELECT * FROM raw_materials", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});
app.put("/api/raw-materials/:id", (req, res) => {
  const { id } = req.params;
  const { name, lowStock } = req.body;
  if (!name || !lowStock) {
    return res.status(400).json({ error: "Name and low stock are required" });
  }
  db.query(
    "UPDATE `raw_materials` SET `name` = ?, `low_stock` = ? WHERE `id` = ?",
    [name, lowStock, id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (results.affectedRows > 0) {
        res.json({ message: "Raw material updated" });
      } else {
        res.status(404).json({ message: "Raw material not found" });
      }
    }
  );
});
app.delete("/api/raw-materials/:id", (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Raw material ID is required" });
  }
  db.query(
    "DELETE FROM `raw_materials` WHERE `id` = ?",
    [id],
    (err, results) => {
      if (err) {
        console.error("Error deleting raw material:", err);
        return res.status(500).json({ error: err.message });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Raw material not found" });
      }
      res.json({ message: "Raw material deleted successfully" });
    }
  );
});
app.get("/api/raw-materials/:id", (req, res) => {
  const { id } = req.params; // Get the ID from the URL parameters
  db.query(
    "SELECT * FROM `raw_materials` WHERE `id` = ?",
    [id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Raw material not found" });
      }
      res.json(results[0]); // Return the first result (should be one if the ID is unique)
    }
  );
});
app.post("/api/raw-materials", (req, res) => {
  const { name, low_stock } = req.body;
  db.query(
    "INSERT INTO `raw_materials` (`name`, `low_stock`) VALUES (?, ?)",
    [name, low_stock],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Raw material added", id: results.insertId });
    }
  );
});

//Suppliers
app.get("/api/suppliers", (req, res) => {
  db.query("SELECT * FROM supplier", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});
app.get("/api/suppliers/:id", (req, res) => {
  const { id } = req.params;
  db.query(
    "SELECT * FROM supplier WHERE id = ?",
    [id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(results[0]);
    }
  );
});
app.post("/api/suppliers", (req, res) => {
  const { name, contact_number, email, balance, address } = req.body;
  db.query(
    "INSERT INTO supplier (name, contact_number, email, balance, address) VALUES (?, ?, ?, ?, ?)",
    [name, contact_number, email, balance, address],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Supplier added", id: results.insertId });
    }
  );
});
app.put("/api/suppliers/:id", (req, res) => {
  const { id } = req.params;
  const { name, contact_number, email, balance, address } = req.body;

  if (!name || !contact_number || !email) {
    return res.status(400).json({ error: "Name, contact number, and email are required" });
  }

  db.query(
    "UPDATE supplier SET name = ?, contact_number = ?, email = ?, balance = ?, address = ? WHERE id = ?",
    [name, contact_number, email, balance, address, id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (results.affectedRows > 0) {
        res.json({ message: "Supplier updated" });
      } else {
        res.status(404).json({ message: "Supplier not found" });
      }
    }
  );
});
app.delete("/api/suppliers/:id", (req, res) => {
  const { id } = req.params;
  db.query(
    "DELETE FROM supplier WHERE id = ?",
    [id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json({ message: "Supplier deleted successfully" });
    }
  );
});

//PO
// Get all purchase orders
app.get("/api/purchase-orders", (req, res) => {
  db.query("SELECT po.id, po.s_id, po.total, po.status, po.date, s.name AS supplier_name FROM po po LEFT JOIN supplier s ON po.s_id = s.id", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.get("/api/purchase-orders-grn", (req, res) => {
  db.query("SELECT po.id, po.s_id, po.total, po.status, po.date, s.name AS supplier_name FROM po po LEFT JOIN supplier s ON po.s_id = s.id WHERE po.status = 'Pending'", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.get("/api/purchase-orders-grn-done", (req, res) => {
  db.query("SELECT po.id, po.s_id, po.total, po.status, po.date, s.name AS supplier_name FROM po po LEFT JOIN supplier s ON po.s_id = s.id WHERE po.status = 'Received'", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Get a single purchase order by ID
app.get("/api/purchase-orders/:id", (req, res) => {
  const { id } = req.params;

  // Query to fetch the purchase order details along with the supplier information
  db.query(
    "SELECT po.*, s.id AS supplier_id, s.name AS supplier_name FROM po po LEFT JOIN supplier s ON po.s_id = s.id WHERE po.id = ?",
    [id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      const poData = results[0];  // Assuming results[0] contains the PO data and supplier info

      // Query to fetch the items associated with the purchase order
      db.query(
        "SELECT pi.*,rm.name AS raw_material_name FROM po_item pi JOIN raw_materials rm ON pi.item_id = rm.id WHERE pi.po_id = ?",
        [id],
        (err, items) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Return the purchase order data along with the associated items and supplier info
          res.json({
            po: poData,
            items: items,  // This could include raw materials, quantities, etc.
          });
        }
      );
    }
  );
});


// Create a new purchase order
app.post("/api/purchase-orders", (req, res) => {
  const { s_id, total, status, items } = req.body; // 'items' is an array of items

  // Step 1: Insert the PO into the 'po' table
  db.query(
    "INSERT INTO po (s_id, total, status) VALUES (?, ?, ?)",
    [s_id, total, status],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Get the inserted PO ID
      const po_id = results.insertId;

      // Step 2: Insert the PO items into the 'po_item' table
      const itemValues = items.map(item => [
        po_id,
        item.rawItemId,   // Assuming rawItemId corresponds to 'item_id'
        item.quantity,
        item.purchasePrice,
        item.totalPrice
      ]);

      // Insert all items in one query
      const sql = "INSERT INTO po_item (po_id, item_id, qty, p_price, total) VALUES ?";
      db.query(sql, [itemValues], (err, results) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Purchase order created with items", po_id });
      });
    }
  );
});


// Update an existing purchase order
app.put('/api/purchase-orders/:id', (req, res) => {
  const { id } = req.params; // PO ID from the URL
  const { status, items, paidAmount, totalAmount, supplierId } = req.body; // Include supplierId, totalAmount, and paidAmount

  // Validate input
  if (!['Pending', 'Reject', 'Received'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'No items provided' });
  }

 

  if (status === 'Received' && (!totalAmount || totalAmount <= 0)) {
    return res.status(400).json({ error: 'Invalid Total Amount' });
  }

  if (status === 'Received' && !supplierId) {
    return res.status(400).json({ error: 'Supplier ID is required for received status' });
  }

  // Update PO status in the database
  const updatePOQuery = `UPDATE po SET status = ?, paid_amount = ? WHERE id = ?`;

  db.query(updatePOQuery, [status, paidAmount || 0, id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error updating PO status', details: err.message });
    }

    // If the status is "Received", update the raw_materials stock
    if (status === 'Received') {
      const updateStockPromises = items.map((item) => {
        const { rawItemId, quantity } = item;

        // Query to update the stock in the raw_materials table
        const updateStockQuery = `
          UPDATE raw_materials
          SET qty = qty + ?
          WHERE id = ?
        `;

        return new Promise((resolve, reject) => {
          db.query(updateStockQuery, [quantity, rawItemId], (err, result) => {
            if (err) {
              return reject(err);
            }
            resolve(result);
          });
        });
      });

      // Execute all stock update queries
      Promise.all(updateStockPromises)
        .then(() => {
          // Calculate the balance amount
          const balanceAmount = totalAmount - paidAmount;

          // If balanceAmount > 0, update the supplier balance
          if (balanceAmount > 0) {
            const updateSupplierBalanceQuery = `
              UPDATE supplier
              SET balance = balance + ?
              WHERE id = ?
            `;

            db.query(updateSupplierBalanceQuery, [balanceAmount, supplierId], (err, result) => {
              if (err) {
                return res.status(500).json({ error: 'Error updating supplier balance', details: err.message });
              }

              res.json({
                message: 'PO, stock, and supplier balance updated successfully',
              });
            });
          } else {
            res.json({ message: 'PO and stock updated successfully' });
          }
        })
        .catch((err) => {
          res.status(500).json({ error: 'Error updating stock', details: err.message });
        });
    } else {
      // If status is not "Received", only update the PO status
      res.json({ message: 'PO status updated successfully' });
    }
  });
});




// Delete a purchase order by ID
app.delete("/api/purchase-orders/:id", (req, res) => {
  const { id } = req.params;
  db.query(
    "DELETE FROM po WHERE id = ?",
    [id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      res.json({ message: "Purchase order deleted successfully" });
    }
  );
});

app.post("/api/stock-adjustments", (req, res) => {
  const { item_id, qty, type, comments } = req.body;

  // Input validation
  if (!item_id || !qty || !type || !comments) {
    return res.status(400).json({ error: "Invalid or missing input data" });
  }

  // Start database transaction
  db.beginTransaction((transactionErr) => {
    if (transactionErr) {
      return res.status(500).json({ error: "Transaction error", details: transactionErr.message });
    }

    // Query to update the `raw_materials` table
    const updateQuery = `
      UPDATE raw_materials
      SET qty = qty ${type.toLowerCase() === "plus" ? "+" : "-"} ?
      WHERE id = ?
    `;

    db.query(updateQuery, [qty, item_id], (updateErr, updateResult) => {
      if (updateErr) {
        // Rollback the transaction if there is an error
        return db.rollback(() => {
          res.status(500).json({ error: "Error updating raw materials", details: updateErr.message });
        });
      }

      // Insert into `stock_adjustment` table
      const insertQuery = `
        INSERT INTO stock_adjusment (item_id, qty, type, comments)
        VALUES (?, ?, ?, ?)
      `;

      db.query(insertQuery, [item_id, qty, type.toLowerCase(),comments], (insertErr, insertResult) => {
        if (insertErr) {
          // Rollback the transaction if there is an error
          return db.rollback(() => {
            res.status(500).json({ error: "Error inserting stock adjustment", details: insertErr.message });
          });
        }

        // Commit the transaction if all queries succeed
        db.commit((commitErr) => {
          if (commitErr) {
            return db.rollback(() => {
              res.status(500).json({ error: "Error committing transaction", details: commitErr.message });
            });
          }

          res.json({
            message: "Stock adjustment added successfully",
            adjustmentId: insertResult.insertId,
          });
        });
      });
    });
  });
});

app.get("/api/stock-adjustments", (req, res) => {
  const query = `
    SELECT 
      sa.id, 
      sa.item_id, 
      sa.qty, 
      sa.type, 
      sa.comments, 
      sa.date, 
      rm.name AS item_name 
    FROM 
      stock_adjusment sa
    INNER JOIN 
      raw_materials rm 
    ON 
      sa.item_id = rm.id
    ORDER BY 
      sa.date DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error fetching stock adjustments", details: err.message });
    }
    res.json(results);
  });
});

app.post("/api/wastage", (req, res) => {
  const { item_id, qty, type, comments } = req.body;

  // Input validation
  if (!item_id || !qty || !type || !comments) {
    return res.status(400).json({ error: "Invalid or missing input data" });
  }

  // Start database transaction
  db.beginTransaction((transactionErr) => {
    if (transactionErr) {
      return res.status(500).json({ error: "Transaction error", details: transactionErr.message });
    }

    // Input validation
  if (!item_id || isNaN(item_id)) {
    return res.status(400).json({ error: "Invalid or missing item ID" });
  }

  if (!qty || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: "Invalid or missing quantity" });
  }

  if (!type || !["in", "out"].includes(type.toLowerCase())) {
    return res.status(400).json({ error: "Invalid or missing adjustment type" });
  }
    const adjustment = type.toLowerCase() === "in" ? "+" : "-";

    // Query to update the `raw_materials` table
    const updateQuery = `
    UPDATE raw_materials
    SET qty = qty ${adjustment} ?
    WHERE id = ?
  `;

    db.query(updateQuery, [qty, item_id], (updateErr, updateResult) => {
      if (updateErr) {
        // Rollback the transaction if there is an error
        return db.rollback(() => {
          res.status(500).json({ error: "Error updating raw materials", details: updateErr.message });
        });
      }

      // Insert into `stock_adjustment` table
      const insertQuery = `
        INSERT INTO wastage (item_id, qty, type, comments)
        VALUES (?, ?, ?, ?)
      `;

      db.query(insertQuery, [item_id, qty, type.toLowerCase(),comments], (insertErr, insertResult) => {
        if (insertErr) {
          // Rollback the transaction if there is an error
          return db.rollback(() => {
            res.status(500).json({ error: "Error inserting stock adjustment", details: insertErr.message });
          });
        }

        // Commit the transaction if all queries succeed
        db.commit((commitErr) => {
          if (commitErr) {
            return db.rollback(() => {
              res.status(500).json({ error: "Error committing transaction", details: commitErr.message });
            });
          }

          res.json({
            message: "Stock adjustment added successfully",
            adjustmentId: insertResult.insertId,
          });
        });
      });
    });
  });
});

app.get("/api/wastage", (req, res) => {
  const query = `
    SELECT 
      sa.id, 
      sa.item_id, 
      sa.qty, 
      sa.type, 
      sa.comments, 
      sa.date, 
      rm.name AS item_name 
    FROM 
      wastage sa
    INNER JOIN 
      raw_materials rm 
    ON 
      sa.item_id = rm.id
    ORDER BY 
      sa.date DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error fetching stock adjustments", details: err.message });
    }
    res.json(results);
  });
});



const PORT = 3457;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
