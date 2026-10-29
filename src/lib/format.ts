const kes = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });

export const formatKES = (amount: number): string => `KSh ${kes.format(amount)}`;

/** Percent off when compare_at_price is higher than price, else 0. */
export const discountPercent = (price: number, compareAt: number | null | undefined): number =>
  compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

/** Cloudinary delivery URLs carry a width transform; request a smaller one for thumbnails. */
export const imageAt = (url: string | undefined | null, width: number): string =>
  url ? url.replace(/w_\d+,c_limit/, `w_${width},c_limit`) : '';

export const NO_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='100%' height='100%' fill='%23F5F5F4'/><text x='50%' y='50%' fill='%23A8A29B' font-family='sans-serif' font-size='18' text-anchor='middle' dy='.3em'>No image</text></svg>";
