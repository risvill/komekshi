const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const authMiddleware = require('./authMiddleware');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Komekshi server is running'
  });
});

app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');

    res.json({
      message: 'Database connection works',
      time: result.rows[0].now
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Database connection failed'
    });
  }
});

app.get('/clients', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        c.id,
        c.name,
        c.phone,
        c.created_at,

        (
          SELECT COUNT(*)
          FROM orders o
          WHERE o.client_id = c.id
            AND o.user_id = $1
            AND o.status = 'COMPLETED'
        ) AS completed_orders_count

      FROM clients c

      WHERE c.user_id = $1

      ORDER BY c.created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Failed to fetch clients'
    });
  }
});
app.post('/clients', authMiddleware, async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name) {
      return res.status(400).json({
        message: 'Client name is required'
      });
    }

    const result = await pool.query(
      `INSERT INTO clients (id, user_id, name, phone)
       VALUES (gen_random_uuid(), $1, $2, $3)
       RETURNING id, name, phone, created_at`,
      [
        req.user.id,
        name,
        phone || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Failed to create client'
    });
  }
});

app.get('/clients/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const clientResult = await pool.query(
      `
      SELECT
        id,
        name,
        phone,
        created_at
      FROM clients
      WHERE id = $1
        AND user_id = $2
      `,
      [id, req.user.id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Клиент не найден',
      });
    }

    const ordersResult = await pool.query(
      `
      SELECT
        o.id,
        o.status,
        o.total,
        o.order_date,
        o.order_time,
        o.address,
        o.created_at,

        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'name', oi.name,
              'quantity', oi.quantity,
              'price', oi.price,
              'unit', oi.unit
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items

      FROM orders o

      LEFT JOIN order_items oi
        ON oi.order_id = o.id

      WHERE o.client_id = $1
        AND o.user_id = $2

      GROUP BY o.id

      ORDER BY
        o.order_date DESC NULLS LAST,
        o.order_time DESC NULLS LAST,
        o.created_at DESC
      `,
      [id, req.user.id]
    );

    const orders = ordersResult.rows;

    const latestOrder = orders[0] || null;

    res.json({
      client: clientResult.rows[0],
      orders,
      latest_address: latestOrder?.address || null,
    });
  } catch (error) {
    console.error('Failed to get client details:', error);

    res.status(500).json({
      message: 'Не удалось загрузить данные клиента',
    });
  }
});

app.patch('/clients/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, phone } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      message: 'Имя клиента обязательно',
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE clients
      SET
        name = $1,
        phone = $2
      WHERE id = $3
        AND user_id = $4
      RETURNING id, name, phone, created_at
      `,
      [
        name.trim(),
        phone?.trim() || null,
        id,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Клиент не найден',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update client:', error);

    res.status(500).json({
      message: 'Не удалось обновить клиента',
    });
  }
});

app.get('/orders', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        o.id,
        o.client_id,
        c.name AS client_name,
        o.status,
        o.subtotal,
        o.discount_type,
        o.discount_value,
        o.total,
        o.order_date,
        o.order_time,
        o.address,
        o.wishes,
        o.created_at,
        o.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'name', oi.name,
              'quantity', oi.quantity,
              'price', oi.price,
              'unit', oi.unit
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM orders o
      LEFT JOIN clients c
        ON c.id = o.client_id
      LEFT JOIN order_items oi
        ON oi.order_id = o.id
      WHERE o.user_id = $1
      GROUP BY o.id, c.name
      ORDER BY
        o.order_date ASC NULLS LAST,
        o.order_time ASC NULLS LAST,
        o.created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Failed to get orders:', error);

    res.status(500).json({
      message: 'Не удалось загрузить заказы',
    });
  }
});

app.post('/orders', authMiddleware, async (req, res) => {
  const {
    client_id,
    discount_type,
    discount_value,
    order_date,
    order_time,
    address,
    wishes,
    items,
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (!Array.isArray(items) || items.length === 0) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        message: 'Заказ должен содержать хотя бы один товар',
      });
    }

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );

    let total = subtotal;

    if (discount_type === 'PERCENT') {
      total = subtotal - (subtotal * Number(discount_value || 0)) / 100;
    }

    if (discount_type === 'FIXED') {
      total = subtotal - Number(discount_value || 0);
    }

    total = Math.max(total, 0);

    const orderResult = await client.query(
      `
      INSERT INTO orders (
        user_id,
        client_id,
        subtotal,
        discount_type,
        discount_value,
        total,
        order_date,
        order_time,
        address,
        wishes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [
        req.user.id,
        client_id || null,
        subtotal,
        discount_type || null,
        discount_value || null,
        total,
        order_date || null,
        order_time || null,
        address || null,
        wishes || null,
      ]
    );

    const order = orderResult.rows[0];

    for (const item of items) {
      await client.query(
        `
        INSERT INTO order_items (
          order_id,
          product_id,
          name,
          quantity,
          price,
          unit
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          order.id,
          item.product_id || null,
          item.name,
          item.quantity,
          item.price,
          item.unit,
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json(order);
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Failed to create order:', error);

    res.status(500).json({
      message: 'Не удалось создать заказ',
    });
  } finally {
    client.release();
  }
});
app.post('/orders/:id/repeat', authMiddleware, async (req, res) => {
  const { id } = req.params;
  let client;

  try {
    client = await pool.connect();

    await client.query('BEGIN');

    const orderResult = await client.query(
      `
      INSERT INTO orders (
        user_id,
        client_id,
        status,
        subtotal,
        discount_type,
        discount_value,
        total,
        order_date,
        order_time,
        address,
        wishes
      )
      SELECT
        user_id,
        client_id,
        'DRAFT',
        subtotal,
        discount_type,
        discount_value,
        total,
        NULL,
        NULL,
        address,
        wishes
      FROM orders
      WHERE id = $1
        AND user_id = $2
      RETURNING *
      `,
      [id, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        message: 'Заказ не найден',
      });
    }

    const newOrder = orderResult.rows[0];

    const itemsResult = await client.query(
      `
      INSERT INTO order_items (
        order_id,
        product_id,
        name,
        quantity,
        price,
        unit
      )
      SELECT
        $1,
        product_id,
        name,
        quantity,
        price,
        unit
      FROM order_items
      WHERE order_id = $2
      RETURNING *
      `,
      [newOrder.id, id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      ...newOrder,
      items: itemsResult.rows,
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }

    console.error('Failed to repeat order:', error);

    res.status(500).json({
      message: 'Не удалось повторить заказ',
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});
app.patch('/orders/:id/status', authMiddleware, async (req, res) => {
const { status } = req.body;
const { id } = req.params;

const allowedStatuses = [
'DRAFT',
'ACCEPTED',
'IN_PROGRESS',
'AWAITING_PICKUP',
'COMPLETED',
'CANCELLED',
];

if (!allowedStatuses.includes(status)) {
return res.status(400).json({
message: 'Недопустимый статус заказа',
});
}

try {
const result = await pool.query(
'UPDATE orders ' +
'SET status = $1, updated_at = now() ' +
'WHERE id = $2 AND user_id = $3 ' +
'RETURNING *',
[status, id, req.user.id]
);

if (result.rows.length === 0) {
return res.status(404).json({
message: 'Заказ не найден',
});
}

res.json(result.rows[0]);
} catch (error) {
console.error('Failed to update order status:', error);

res.status(500).json({
message: 'Не удалось изменить статус заказа',
});
}
});
app.get('/analytics/financial', authMiddleware, async (req, res) => {
  const { start_date, end_date } = req.query;
  const userId = req.user.id;

  if (
    typeof start_date !== 'string' ||
    typeof end_date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(start_date) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(end_date) ||
    start_date > end_date
  ) {
    return res.status(400).json({
      message: 'Укажите корректный период аналитики',
    });
  }

  try {
    const params = [userId, start_date, end_date];

    // 1. Основные финансовые показатели

    const summaryResult = await pool.query(
      `
      SELECT
        COALESCE(SUM(p.amount), 0)::float AS total_income,

        COUNT(p.id)::int AS payments_count,

        COUNT(DISTINCT p.order_id)::int AS paid_orders_count,

        (
          COALESCE(SUM(p.amount), 0) /
          ($3::date - $2::date + 1)
        )::float AS average_daily_income

      FROM payments p

      JOIN orders o
        ON o.id = p.order_id

      WHERE o.user_id = $1
        AND p.payment_date::date
          BETWEEN $2::date AND $3::date
      `,
      params
    );

    // 2. Доход за предыдущий период

    const previousResult = await pool.query(
      `
      SELECT
        COALESCE(SUM(p.amount), 0)::float AS total_income,

        COUNT(p.id)::int AS payments_count,

        (
          COALESCE(SUM(p.amount), 0) /
          ($3::date - $2::date + 1)
        )::float AS average_daily_income

      FROM payments p

      JOIN orders o
        ON o.id = p.order_id

      WHERE o.user_id = $1

        AND p.payment_date::date BETWEEN
          ($2::date - ($3::date - $2::date + 1))
          AND ($2::date - 1)
      `,
      params
    );

    // 3. Динамика поступлений по дням

    const dynamicsResult = await pool.query(
      `
      WITH daily_income AS (
        SELECT
          p.payment_date::date AS payment_day,

          SUM(p.amount)::float AS total_income,

          COUNT(p.id)::int AS payments_count

        FROM payments p

        JOIN orders o
          ON o.id = p.order_id

        WHERE o.user_id = $1

          AND p.payment_date::date
            BETWEEN $2::date AND $3::date

        GROUP BY p.payment_date::date
      )

      SELECT
        TO_CHAR(d.day, 'YYYY-MM-DD') AS date,

        COALESCE(i.total_income, 0) AS total_income,

        COALESCE(i.payments_count, 0) AS payments_count

      FROM generate_series(
        $2::date,
        $3::date,
        INTERVAL '1 day'
      ) AS d(day)

      LEFT JOIN daily_income i
        ON i.payment_day = d.day::date

      ORDER BY d.day ASC
      `,
      params
    );

    // 4. Распределение поступлений по счетам

    const accountsResult = await pool.query(
      `
      SELECT
        a.id AS account_id,
        a.name,
        a.type,
        a.is_active,

        COALESCE(SUM(p.amount), 0)::float AS total_income,

        COUNT(p.id)::int AS payments_count

      FROM payments p

      JOIN orders o
        ON o.id = p.order_id

      JOIN accounts a
        ON a.id = p.account_id
        AND a.user_id = o.user_id

      WHERE o.user_id = $1

        AND p.payment_date::date
          BETWEEN $2::date AND $3::date

      GROUP BY
        a.id,
        a.name,
        a.type,
        a.is_active

      ORDER BY total_income DESC
      `,
      params
    );

    // 5. Ожидаемые поступления

    const outstandingResult = await pool.query(
      `
      WITH order_balances AS (
        SELECT
          o.id,
          o.status,
          o.total,

          GREATEST(
            o.total - COALESCE(SUM(p.amount), 0),
            0
          ) AS remaining_amount

        FROM orders o

        LEFT JOIN payments p
          ON p.order_id = o.id

        WHERE o.user_id = $1

          AND o.status IN (
            'ACCEPTED',
            'IN_PROGRESS',
            'AWAITING_PICKUP',
            'COMPLETED'
          )

        GROUP BY o.id, o.status, o.total
      )

      SELECT
        COALESCE(
          SUM(remaining_amount),
          0
        )::float AS total_outstanding,

        COUNT(*) FILTER (
          WHERE remaining_amount > 0
        )::int AS unpaid_orders_count,

        COALESCE(
          SUM(remaining_amount) FILTER (
            WHERE status = 'COMPLETED'
          ),
          0
        )::float AS completed_orders_debt,

        COALESCE(
          SUM(remaining_amount) FILTER (
            WHERE status != 'COMPLETED'
          ),
          0
        )::float AS active_orders_outstanding

      FROM order_balances
      `,
      [userId]
    );

    // 6. Самый доходный день выбранного периода

    const bestDayResult = await pool.query(
      `
      SELECT
        TO_CHAR(
          p.payment_date::date,
          'YYYY-MM-DD'
        ) AS date,

        SUM(p.amount)::float AS total_income

      FROM payments p

      JOIN orders o
        ON o.id = p.order_id

      WHERE o.user_id = $1

        AND p.payment_date::date
          BETWEEN $2::date AND $3::date

      GROUP BY p.payment_date::date

      ORDER BY total_income DESC, date ASC

      LIMIT 1
      `,
      params
    );

    // 7. Самый доходный месяц выбранного периода

    const bestMonthResult = await pool.query(
      `
      SELECT
        TO_CHAR(
          p.payment_date,
          'YYYY-MM'
        ) AS month,

        SUM(p.amount)::float AS total_income

      FROM payments p

      JOIN orders o
        ON o.id = p.order_id

      WHERE o.user_id = $1

        AND p.payment_date::date
          BETWEEN $2::date AND $3::date

      GROUP BY TO_CHAR(
        p.payment_date,
        'YYYY-MM'
      )

      ORDER BY total_income DESC, month ASC

      LIMIT 1
      `,
      params
    );

    // 8. Прогноз дохода на текущий месяц

    const forecastResult = await pool.query(
      `
      WITH local_date AS (
        SELECT
          (NOW() AT TIME ZONE 'Asia/Almaty')::date
            AS today
      ),

      month_info AS (
        SELECT
          today,

          DATE_TRUNC(
            'month',
            today
          )::date AS month_start,

          (
            DATE_TRUNC('month', today)
            + INTERVAL '1 month'
            - INTERVAL '1 day'
          )::date AS month_end

        FROM local_date
      ),

      month_income AS (
        SELECT
          COALESCE(SUM(p.amount), 0) AS income

        FROM payments p

        JOIN orders o
          ON o.id = p.order_id

        CROSS JOIN month_info m

        WHERE o.user_id = $1

          AND p.payment_date::date
            BETWEEN m.month_start AND m.today
      )

      SELECT
        i.income::float AS current_month_income,

        (m.today - m.month_start + 1)::int
          AS elapsed_days,

        (m.month_end - m.month_start + 1)::int
          AS total_days,

        (
          i.income /
          (m.today - m.month_start + 1)
        )::float AS average_daily_income,

        (
          i.income /
          (m.today - m.month_start + 1) *
          (m.month_end - m.month_start + 1)
        )::float AS predicted_income

      FROM month_info m

      CROSS JOIN month_income i
      `,
      [userId]
    );

    const summary = summaryResult.rows[0];
    const previous = previousResult.rows[0];

    const calculateGrowth = (current, previousValue) => {
      if (previousValue === 0) {
        return current === 0 ? 0 : null;
      }

      return Number(
        (
          ((current - previousValue) / previousValue) * 100
        ).toFixed(1)
      );
    };

    const accounts = accountsResult.rows.map((account) => ({
      ...account,

      percentage:
        summary.total_income > 0
          ? Number(
              (
                account.total_income /
                summary.total_income *
                100
              ).toFixed(1)
            )
          : 0,
    }));

    res.json({
      period: {
        start_date,
        end_date,
      },

      summary,

      previous_period: previous,

      growth: {
        total_income: calculateGrowth(
          summary.total_income,
          previous.total_income
        ),

        payments_count: calculateGrowth(
          summary.payments_count,
          previous.payments_count
        ),

        average_daily_income: calculateGrowth(
          summary.average_daily_income,
          previous.average_daily_income
        ),
      },

      dynamics: dynamicsResult.rows,

      accounts,

      outstanding: outstandingResult.rows[0],

      best_day: bestDayResult.rows[0] || null,

      best_month: bestMonthResult.rows[0] || null,

      forecast: forecastResult.rows[0],
    });

  } catch (error) {
    console.error(
      'Failed to get financial analytics:',
      error
    );

    res.status(500).json({
      message: 'Не удалось загрузить финансовую аналитику',
    });
  }
});

app.get('/analytics/sales', authMiddleware, async (req, res) => {
  const { start_date, end_date } = req.query;
  const userId = req.user.id;

  if (
    typeof start_date !== 'string' ||
    typeof end_date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(start_date) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(end_date) ||
    start_date > end_date
  ) {
    return res.status(400).json({
      message: 'Укажите корректный период аналитики',
    });
  }

  try {
    const params = [userId, start_date, end_date];

    // 1. Основные показатели продаж
    const summaryResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS orders_count,
        COALESCE(SUM(total), 0)::float AS total_sales,
        COALESCE(AVG(total), 0)::float AS average_check
      FROM orders
      WHERE user_id = $1
        AND status = 'COMPLETED'
        AND order_date BETWEEN $2::date AND $3::date
      `,
      params
    );

    // 2. Количество проданных товаров
    const quantityResult = await pool.query(
      `
      SELECT
        COALESCE(
          SUM(oi.quantity) FILTER (WHERE oi.unit = 'piece'),
          0
        )::float AS pieces_sold,

        COALESCE(
          SUM(oi.quantity) FILTER (WHERE oi.unit = 'portion'),
          0
        )::float AS portions_sold

      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id

      WHERE o.user_id = $1
        AND o.status = 'COMPLETED'
        AND o.order_date BETWEEN $2::date AND $3::date
      `,
      params
    );

    // 3. Статистика по товарам
    const productsResult = await pool.query(
      `
      SELECT
        oi.product_id,
        COALESCE(p.name, oi.name) AS name,
        oi.unit,

        SUM(oi.quantity)::float AS quantity_sold,

        COUNT(DISTINCT o.id)::int AS orders_count,

        SUM(oi.quantity * oi.price)::float AS gross_revenue,

        SUM(
          CASE
            WHEN o.subtotal > 0
            THEN oi.quantity * oi.price * o.total / o.subtotal
            ELSE 0
          END
        )::float AS revenue

      FROM order_items oi

      JOIN orders o
        ON o.id = oi.order_id

      LEFT JOIN products p
        ON p.id = oi.product_id
        AND p.user_id = o.user_id

      WHERE o.user_id = $1
        AND o.status = 'COMPLETED'
        AND o.order_date BETWEEN $2::date AND $3::date

      GROUP BY
        oi.product_id,
        COALESCE(p.name, oi.name),
        oi.unit

      ORDER BY quantity_sold DESC
      `,
      params
    );

    // 4. Динамика продаж по дням
    const dynamicsResult = await pool.query(
      `
      SELECT
        TO_CHAR(d.day, 'YYYY-MM-DD') AS date,

        COUNT(o.id)::int AS orders_count,

        COALESCE(SUM(o.total), 0)::float AS total_sales

      FROM generate_series(
        $2::date,
        $3::date,
        INTERVAL '1 day'
      ) AS d(day)

      LEFT JOIN orders o
        ON o.order_date = d.day::date
        AND o.user_id = $1
        AND o.status = 'COMPLETED'

      GROUP BY d.day
      ORDER BY d.day ASC
      `,
      params
    );

    // 5. Загруженность по дням недели
    const weekdaysResult = await pool.query(
      `
      SELECT
        EXTRACT(ISODOW FROM order_date)::int AS weekday,

        COUNT(*)::int AS orders_count,

        COALESCE(SUM(total), 0)::float AS total_sales

      FROM orders

      WHERE user_id = $1
        AND status = 'COMPLETED'
        AND order_date BETWEEN $2::date AND $3::date

      GROUP BY weekday
      ORDER BY weekday ASC
      `,
      params
    );

    const weekdays = Array.from(
      { length: 7 },
      (_, index) => {
        const weekday = index + 1;

        return (
          weekdaysResult.rows.find(
            (row) => row.weekday === weekday
          ) || {
            weekday,
            orders_count: 0,
            total_sales: 0,
          }
        );
      }
    );

    // 6. Показатели предыдущего периода
    const previousResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS orders_count,
        COALESCE(SUM(total), 0)::float AS total_sales,
        COALESCE(AVG(total), 0)::float AS average_check

      FROM orders

      WHERE user_id = $1
        AND status = 'COMPLETED'

        AND order_date BETWEEN
          ($2::date - ($3::date - $2::date + 1))
          AND ($2::date - 1)
      `,
      params
    );

    // 7. Активные товары, которые не продавались
    const unsoldProductsResult = await pool.query(
      `
      SELECT
        p.id AS product_id,
        p.name,
        p.unit,
        0 AS quantity_sold,
        0 AS orders_count,
        0 AS revenue

      FROM products p

      WHERE p.user_id = $1
        AND p.is_active = true

        AND NOT EXISTS (
          SELECT 1
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id

          WHERE oi.product_id = p.id
            AND o.user_id = $1
            AND o.status = 'COMPLETED'
            AND o.order_date BETWEEN $2::date AND $3::date
        )

      ORDER BY p.name ASC
      `,
      params
    );

    const summary = summaryResult.rows[0];
    const previous = previousResult.rows[0];

    const calculateGrowth = (current, previousValue) => {
      if (previousValue === 0) {
        return current === 0 ? 0 : null;
      }

      return Number(
        (
          ((current - previousValue) / previousValue) * 100
        ).toFixed(1)
      );
    };

    res.json({
      period: {
        start_date,
        end_date,
      },

      summary: {
        ...summary,
        ...quantityResult.rows[0],
      },

      previous_period: previous,

      growth: {
        total_sales: calculateGrowth(
          summary.total_sales,
          previous.total_sales
        ),

        orders_count: calculateGrowth(
          summary.orders_count,
          previous.orders_count
        ),

        average_check: calculateGrowth(
          summary.average_check,
          previous.average_check
        ),
      },

      products: productsResult.rows,

      unsold_products: unsoldProductsResult.rows,

      dynamics: dynamicsResult.rows,

      weekdays,
    });

  } catch (error) {
    console.error('Failed to get sales analytics:', error);

    res.status(500).json({
      message: 'Не удалось загрузить аналитику продаж',
    });
  }
});

app.get('/products', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        price,
        unit,
        pieces_per_portion,
        is_active
      FROM products
      WHERE user_id = $1
        AND is_active = true
      ORDER BY name ASC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Failed to get products:', error);
    res.status(500).json({
      message: 'Не удалось загрузить товары',
    });
  }
});

app.post('/products', authMiddleware, async (req, res) => {
  const {
    name,
    price,
    unit,
    pieces_per_portion,
  } = req.body;

  if (!name || price === undefined || !unit) {
    return res.status(400).json({
      message: 'Название, цена и единица измерения обязательны',
    });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO products (
        user_id,
        name,
        price,
        unit,
        pieces_per_portion
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        req.user.id,
        name.trim(),
        price,
        unit,
        pieces_per_portion ?? null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create product:', error);

    res.status(500).json({
      message: 'Не удалось создать товар',
    });
  }
});


app.patch('/products/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, price, unit, pieces_per_portion } = req.body;

  const numericPrice = Number(price);
  const numericPieces = Number(pieces_per_portion);

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    price === null ||
    price === undefined ||
    !Number.isFinite(numericPrice) ||
    numericPrice <= 0 ||
    !['piece', 'portion'].includes(unit) ||
    (unit === 'portion' &&
      (!Number.isInteger(numericPieces) || numericPieces <= 0))
  ) {
    return res.status(400).json({
      message: 'Проверьте название, цену и единицу измерения',
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE products
      SET
        name = $1,
        price = $2,
        unit = $3,
        pieces_per_portion = $4
      WHERE id = $5
        AND user_id = $6
        AND is_active = true
      RETURNING *
      `,
      [
        name.trim(),
        numericPrice,
        unit,
        unit === 'portion' ? numericPieces : null,
        id,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Товар не найден',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update product:', error);
    res.status(500).json({
      message: 'Не удалось изменить товар',
    });
  }
});

app.delete('/products/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      UPDATE products
      SET is_active = false
      WHERE id = $1
        AND user_id = $2
        AND is_active = true
      RETURNING id
      `,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Товар не найден',
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete product:', error);
    res.status(500).json({
      message: 'Не удалось удалить товар',
    });
  }
});


app.get('/accounts', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        a.id,
        a.name,
        a.type,
        a.is_active,
        a.created_at,
        a.updated_at,
        COALESCE(
          (
            SELECT SUM(p.amount)
            FROM payments p
            JOIN orders o
              ON o.id = p.order_id
            WHERE p.account_id = a.id
              AND o.user_id = $1
          ),
          0
        ) AS balance
      FROM accounts a
      WHERE a.user_id = $1
      ORDER BY
        a.is_active DESC,
        a.name ASC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Failed to get accounts:', error);

    res.status(500).json({
      message: 'Не удалось загрузить счета',
    });
  }
});

app.post('/accounts', authMiddleware, async (req, res) => {
  const { name, type } = req.body;

  const allowedTypes = [
    'KASPI',
    'CASH',
  ];

  if (!name || !name.trim()) {
    return res.status(400).json({
      message: 'Название счёта обязательно',
    });
  }

  if (!allowedTypes.includes(type)) {
    return res.status(400).json({
      message: 'Недопустимый тип счёта',
    });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO accounts (
        id,
        user_id,
        name,
        type,
        is_active
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        true
      )
      RETURNING *
      `,
      [
        req.user.id,
        name.trim(),
        type,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create account:', error);

    res.status(500).json({
      message: 'Не удалось создать счёт',
    });
  }
});

app.patch('/accounts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, type } = req.body;

  const allowedTypes = [
    'KASPI',
    'CASH',
  ];

  if (!name || !name.trim()) {
    return res.status(400).json({
      message: 'Название счёта обязательно',
    });
  }

  if (!allowedTypes.includes(type)) {
    return res.status(400).json({
      message: 'Недопустимый тип счёта',
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE accounts
      SET
        name = $1,
        type = $2,
        updated_at = NOW()
      WHERE id = $3
        AND user_id = $4
      RETURNING *
      `,
      [
        name.trim(),
        type,
        id,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Счёт не найден',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update account:', error);

    res.status(500).json({
      message: 'Не удалось изменить счёт',
    });
  }
});

app.delete('/accounts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { target_account_id } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const accountResult = await client.query(
      `
      SELECT id, name
      FROM accounts
      WHERE id = $1
        AND user_id = $2
      `,
      [id, req.user.id]
    );

    if (accountResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        message: 'Счёт не найден',
      });
    }

    const paymentsResult = await client.query(
      `
      SELECT COUNT(*)::int AS count
      FROM payments p
      JOIN orders o
        ON o.id = p.order_id
      WHERE p.account_id = $1
        AND o.user_id = $2
      `,
      [id, req.user.id]
    );

    const paymentCount = paymentsResult.rows[0].count;

    if (paymentCount > 0) {
      if (!target_account_id) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          message: 'Необходимо выбрать счёт для переноса платежей',
        });
      }

      if (target_account_id === id) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          message: 'Нельзя перенести платежи на тот же счёт',
        });
      }

      const targetAccountResult = await client.query(
        `
        SELECT id
        FROM accounts
        WHERE id = $1
          AND user_id = $2
          AND is_active = true
        `,
        [target_account_id, req.user.id]
      );

      if (targetAccountResult.rows.length === 0) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          message: 'Счёт для переноса не найден или отключён',
        });
      }

      await client.query(
        `
        UPDATE payments p
        SET account_id = $1
        FROM orders o
        WHERE p.account_id = $2
          AND p.order_id = o.id
          AND o.user_id = $3
        `,
        [
          target_account_id,
          id,
          req.user.id,
        ]
      );
    }

    await client.query(
      `
      DELETE FROM accounts
      WHERE id = $1
        AND user_id = $2
      `,
      [id, req.user.id]
    );

    await client.query('COMMIT');

    res.status(204).send();
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Failed to delete account:', error);

    res.status(500).json({
      message: 'Не удалось удалить счёт',
    });
  } finally {
    client.release();
  }
});

app.get('/orders/:id/payments', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT
        p.id,
        p.order_id,
        p.account_id,
        p.amount,
        p.payment_date,
        p.created_at,
        a.name AS account_name,
        a.type AS account_type
      FROM payments p
      JOIN accounts a
        ON a.id = p.account_id
      JOIN orders o
        ON o.id = p.order_id
      WHERE p.order_id = $1
        AND o.user_id = $2
      ORDER BY p.payment_date DESC, p.created_at DESC
      `,
      [id, req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Failed to get order payments:', error);

    res.status(500).json({
      message: 'Не удалось загрузить платежи',
    });
  }
});

app.post('/orders/:id/payments', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { account_id, amount, payment_date } = req.body;

  if (!account_id || amount === undefined) {
    return res.status(400).json({
      message: 'Счёт и сумма обязательны',
    });
  }

  const paymentAmount = Number(amount);

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({
      message: 'Сумма платежа должна быть больше 0',
    });
  }

  try {
    const orderResult = await pool.query(
      `
      SELECT id, total
      FROM orders
      WHERE id = $1
        AND user_id = $2
      `,
      [id, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Заказ не найден',
      });
    }

    const accountResult = await pool.query(
      `
      SELECT id
      FROM accounts
      WHERE id = $1
        AND user_id = $2
        AND is_active = true
      `,
      [account_id, req.user.id]
    );

    if (accountResult.rows.length === 0) {
      return res.status(400).json({
        message: 'Счёт не найден или отключён',
      });
    }

    const result = await pool.query(
      `
      INSERT INTO payments (
        id,
        order_id,
        account_id,
        amount,
        payment_date
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4
      )
      RETURNING *
      `,
      [
        id,
        account_id,
        paymentAmount,
        payment_date || new Date().toISOString(),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create payment:', error);

    res.status(500).json({
      message: 'Не удалось добавить платёж',
    });
  }
});

app.patch('/me', authMiddleware, async (req, res) => {
  const {
    name,
    email,
    phone,
    business_name,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      message: 'Имя обязательно',
    });
  }

  if (!email || !email.trim()) {
    return res.status(400).json({
      message: 'Email обязателен',
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE users
      SET
        name = $1,
        email = $2,
        phone = $3,
        business_name = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING
        id,
        name,
        phone,
        email,
        business_name
      `,
      [
        name.trim(),
        email.trim(),
        phone?.trim() || null,
        business_name?.trim() || null,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Пользователь не найден',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update profile:', error);

    res.status(500).json({
      message: 'Не удалось изменить данные аккаунта',
    });
  }
});

app.get('/tasks', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        t.id,
        t.title,
        t.status,
        t.deadline,
        t.created_at,
        t.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', o.id,
              'client_name', c.name,
              'order_date', o.order_date,
              'order_time', o.order_time,
              'total', o.total
            )
          ) FILTER (WHERE o.id IS NOT NULL),
          '[]'
        ) AS orders
      FROM tasks t
      LEFT JOIN task_orders to_link
        ON to_link.task_id = t.id
      LEFT JOIN orders o
        ON o.id = to_link.order_id
      LEFT JOIN clients c
        ON c.id = o.client_id
      WHERE t.user_id = $1
      GROUP BY t.id
      ORDER BY
        t.deadline IS NULL,
        t.deadline ASC,
        t.created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Failed to get tasks:', error);

    res.status(500).json({
      message: 'Не удалось загрузить задачи',
    });
  }
});

app.get('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        t.id,
        t.user_id,
        t.title,
        t.status,
        t.deadline,
        t.created_at,
        t.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', o.id,
              'client_name', c.name
            )
          ) FILTER (WHERE o.id IS NOT NULL),
          '[]'
        ) AS orders
      FROM tasks t
      LEFT JOIN task_orders tor
        ON tor.task_id = t.id
      LEFT JOIN orders o
        ON o.id = tor.order_id
      LEFT JOIN clients c
        ON c.id = o.client_id
      WHERE t.id = $1
        AND t.user_id = $2
      GROUP BY t.id
      `,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Task not found',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Failed to load task',
    });
  }
});
app.post('/tasks', authMiddleware, async (req, res) => {
  const { title, deadline, order_ids } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      message: 'Название задачи обязательно',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orderIds = Array.isArray(order_ids)
      ? [...new Set(order_ids)]
      : [];

    if (orderIds.length > 0) {
      const ordersResult = await client.query(
        `
        SELECT
          id,
          status
        FROM orders
        WHERE id = ANY($1::uuid[])
          AND user_id = $2
        `,
        [
          orderIds,
          req.user.id,
        ]
      );

      const orders = ordersResult.rows;

      if (orders.length !== orderIds.length) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          message: 'Один или несколько заказов не найдены',
        });
      }

      const forbiddenOrders = orders.filter(
        (order) =>
          order.status !== 'ACCEPTED' &&
          order.status !== 'IN_PROGRESS'
      );

      if (forbiddenOrders.length > 0) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          message:
            'К задаче можно привязывать только принятые заказы или заказы в процессе',
        });
      }
    }

    const taskResult = await client.query(
      `
      INSERT INTO tasks (
        id,
        user_id,
        title,
        status,
        deadline
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        'TODO',
        $3
      )
      RETURNING *
      `,
      [
        req.user.id,
        title.trim(),
        deadline || null,
      ]
    );

    const task = taskResult.rows[0];

    for (const orderId of orderIds) {
      await client.query(
        `
        INSERT INTO task_orders (
          task_id,
          order_id
        )
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        `,
        [
          task.id,
          orderId,
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json(task);
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Failed to create task:', error);

    res.status(500).json({
      message: 'Не удалось создать задачу',
    });
  } finally {
    client.release();
  }
});

app.patch('/tasks/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, deadline } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      message: 'Название задачи обязательно',
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE tasks
      SET
        title = $1,
        deadline = $2,
        updated_at = now()
      WHERE id = $3
        AND user_id = $4
      RETURNING *
      `,
      [
        title.trim(),
        deadline || null,
        id,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Задача не найдена',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update task:', error);

    res.status(500).json({
      message: 'Не удалось изменить задачу',
    });
  }
});

app.patch('/tasks/:id/status', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = [
    'TODO',
    'IN_PROGRESS',
    'DONE',
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: 'Недопустимый статус задачи',
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE tasks
      SET
        status = $1,
        updated_at = now()
      WHERE id = $2
        AND user_id = $3
      RETURNING *
      `,
      [
        status,
        id,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Задача не найдена',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update task status:', error);

    res.status(500).json({
      message: 'Не удалось изменить статус задачи',
    });
  }
});

app.delete('/tasks/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `
      DELETE FROM task_orders
      WHERE task_id = $1
        AND EXISTS (
          SELECT 1
          FROM tasks
          WHERE tasks.id = $1
            AND tasks.user_id = $2
        )
      `,
      [id, req.user.id]
    );

    const result = await client.query(
      `
      DELETE FROM tasks
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
      [
        id,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        message: 'Задача не найдена',
      });
    }

    await client.query('COMMIT');

    res.json({
      message: 'Задача удалена',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to delete task:', error);

    res.status(500).json({
      message: 'Не удалось удалить задачу',
    });
  } finally {
    client.release();
  }
});

app.get('/orders/:id/tasks', authMiddleware, async (req, res) => {
try {
const { id } = req.params;

const result = await pool.query(
  `
  SELECT
    t.id,
    t.title,
    t.status,
    t.deadline,
    t.created_at,
    t.updated_at
  FROM tasks t
  JOIN task_orders to_link
    ON to_link.task_id = t.id
  WHERE to_link.order_id = $1
    AND t.user_id = $2
  ORDER BY
    t.deadline ASC NULLS LAST,
    t.created_at DESC
  `,
  [id, req.user.id]
);

res.json(result.rows);

} catch (error) {
console.error('Failed to get tasks for order:', error);

res.status(500).json({
  message: 'Failed to get tasks for order'
});

}
});

app.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, business_name } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users
       (id, name, phone, email, password, business_name)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING id, name, phone, email, business_name, created_at`,
      [
        name,
        phone || null,
        email,
        passwordHash,
        business_name || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Failed to register user'
    });
  }
});


app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    const result = await pool.query(
      'SELECT id, name, phone, email, password, business_name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({
    token,
    user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        business_name: user.business_name
    }
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Login failed'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Komekshi server is running on port ${PORT}`);
});