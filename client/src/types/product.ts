export type Product = {
  id: string;
  name: string;
  price: string;
  unit: 'piece' | 'portion';
  pieces_per_portion: number | null;
  is_active: boolean;
};