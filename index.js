const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json()); // To handle JSON payloads

// Database connection
const db = mysql.createConnection({
  host: "203.161.41.165",
  user: "danusha_stock",
  password: "Supun878@96",
  database: "danusha_stock",
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



const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
