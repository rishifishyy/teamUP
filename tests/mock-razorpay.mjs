export const orders = new Map();
export const payments = new Map();
let sequence = 0;
export default class Razorpay {
  orders = {
    create: async data => { const order = { ...data, id: `order_test_${++sequence}` }; orders.set(order.id, order); return order; },
    fetch: async id => { if (!orders.has(id)) throw new Error('Unknown test order'); return orders.get(id); }
  };
  payments = {
    fetch: async id => { if (!payments.has(id)) throw new Error('Unknown test payment'); return payments.get(id); }
  };
}
