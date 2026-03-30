const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'shopease',  
  password: '@hopekiige',
  port: 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.query('SELECT NOW()', (err) => {
    if (err) console.error('DB Error:', err.message);
    else console.log('Connected to shopease database!');
});

// === Swagger===
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// === PRODUCTS CRUD ===
app.get('/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products LIMIT 100');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/products/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query('SELECT * FROM products WHERE product_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/products', async (req, res) => {
    const { product_name, category, price, stock_quantity } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO products (product_name, category, price, stock_quantity) VALUES ($1, $2, $3, $4) RETURNING *',
            [product_name, category, price, stock_quantity || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/products/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { product_name, category, price, stock_quantity } = req.body;
    try {
        const result = await pool.query(
            'UPDATE products SET product_name = $1, category = $2, price = $3, stock_quantity = $4 WHERE product_id = $5 RETURNING *',
            [product_name, category, price, stock_quantity, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/products/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query('DELETE FROM products WHERE product_id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted', product: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === ORDERS CRUD ===
app.get('/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY order_date DESC LIMIT 100');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/orders/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query('SELECT * FROM orders WHERE order_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/orders/:id/items', async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query(
            `SELECT oi.*, p.product_name, p.category 
             FROM order_items oi 
             JOIN products p ON oi.product_id = p.product_id 
             WHERE oi.order_id = $1`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === CUSTOMERS CRUD ===
app.get('/customers', async (req, res) => {
    try {
        const result = await pool.query('SELECT customer_id, first_name, last_name, email FROM customers ORDER BY customer_id LIMIT 100');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/customers/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/customers/:id/orders', async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query(
            `SELECT * FROM orders WHERE customer_id = $1 ORDER BY order_date DESC`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === DASHBOARD STATS ===
app.get('/dashboard/stats', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM customers) as total_customers,
                (SELECT COUNT(*) FROM orders) as total_orders,
                (SELECT COUNT(*) FROM products) as total_products,
                (SELECT COALESCE(SUM(total_amount), 0) FROM orders) as total_revenue,
                (SELECT COALESCE(AVG(total_amount), 0) FROM orders) as avg_order_value
        `);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/dashboard/sales-by-category', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.category, 
                   SUM(oi.quantity) as total_quantity,
                   SUM(oi.quantity * oi.unit_price) as total_revenue
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.product_id 
            GROUP BY p.category 
            ORDER BY total_revenue DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



app.get('/api/products/top', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const result = await pool.query('SELECT * FROM get_top_products($1)', [limit]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error in /api/products/top:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get customer summary (using stored procedure)
app.get('/api/customers/:id/summary', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM get_customer_summary($1)', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error in /api/customers/:id/summary:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get sales by period (using stored procedure)
app.get('/api/sales/period', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            return res.status(400).json({ 
                error: 'Missing parameters',
                message: 'Please provide start_date and end_date in YYYY-MM-DD format',
                example: '/api/sales/period?start_date=2026-01-01&end_date=2026-01-31'
            });
        }
        const result = await pool.query('SELECT * FROM get_sales_by_period($1, $2)', [start_date, end_date]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error in /api/sales/period:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get monthly sales report (using stored procedure)
app.get('/api/sales/monthly', async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const result = await pool.query('SELECT * FROM get_monthly_sales_report($1)', [year]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error in /api/sales/monthly:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get category performance (using stored procedure)
app.get('/api/categories/performance', async (req, res) => {
    try {
        const min_revenue = parseFloat(req.query.min_revenue) || 0;
        const result = await pool.query('SELECT * FROM get_category_performance($1)', [min_revenue]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error in /api/categories/performance:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get low stock alerts (using stored procedure)
app.get('/api/products/low-stock', async (req, res) => {
    try {
        const threshold = parseInt(req.query.threshold) || 20;
        const result = await pool.query('SELECT * FROM get_low_stock_alert($1)', [threshold]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error in /api/products/low-stock:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Simple root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'ShopEase API is running!',
        endpoints: {
            products: '/products',
            orders: '/orders',
            customers: '/customers',
            dashboard: '/dashboard/stats',
            stored_procedures: {
                top_products: '/api/products/top?limit=10',
                customer_summary: '/api/customers/:id/summary',
                sales_by_period: '/api/sales/period?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD',
                monthly_sales: '/api/sales/monthly?year=2026',
                category_performance: '/api/categories/performance',
                low_stock: '/api/products/low-stock?threshold=20'
            },
            swagger: '/api-docs'
        }
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log('\n ShopEase API Server Started!');
    console.log('='.repeat(50));
    console.log(`Products API: http://localhost:${PORT}/products`);
    console.log(`Orders API: http://localhost:${PORT}/orders`);
    console.log(`Customers API: http://localhost:${PORT}/customers`);
    console.log(`Dashboard API: http://localhost:${PORT}/dashboard/stats`);
    console.log(`Stored Procedures API: http://localhost:${PORT}/api/products/top`);
    console.log(`Swagger Docs: http://localhost:${PORT}/api-docs`);
    console.log(`Home: http://localhost:${PORT}/`);
    console.log('='.repeat(50));
});