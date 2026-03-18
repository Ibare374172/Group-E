CREATE TABLE IF NOT EXISTS sales (
    order_id VARCHAR(10) PRIMARY KEY,
    order_date DATE NOT NULL,
    customer_id VARCHAR(10) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    product_name VARCHAR(100),
    category VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_sales DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL
);


CREATE INDEX idx_order_date ON sales(order_date);
CREATE INDEX idx_customer_id ON sales(customer_id);
CREATE INDEX idx_category ON sales(category);
CREATE INDEX idx_payment_method ON sales(payment_method);


CREATE VIEW monthly_sales_summary AS
SELECT 
    DATE_TRUNC('month', order_date) AS month,
    COUNT(*) as total_orders,
    SUM(total_sales) as revenue,
    AVG(total_sales) as avg_order_value,
    COUNT(DISTINCT customer_id) as unique_customers
FROM sales
GROUP BY DATE_TRUNC('month')
ORDER BY month DESC;


CREATE VIEW category_performance AS
SELECT 
    category,
    COUNT(*) as order_count,
    SUM(quantity) as units_sold,
    SUM(total_sales) as total_revenue,
    AVG(unit_price) as avg_price,
    SUM(total_sales) / SUM(quantity) as avg_revenue_per_unit
FROM sales
GROUP BY category
ORDER BY total_revenue DESC;


CREATE VIEW payment_method_analysis AS
SELECT 
    payment_method,
    COUNT(*) as transaction_count,
    SUM(total_sales) as total_amount,
    AVG(total_sales) as avg_transaction_value,
    COUNT(DISTINCT customer_id) as unique_customers
FROM sales
GROUP BY payment_method
ORDER BY total_amount DESC;