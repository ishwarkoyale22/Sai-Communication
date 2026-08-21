import { createServerFn } from "@tanstack/react-start";
import {
  createAdminSession,
  deleteAdminSession,
  assertAdminSession,
  saveProduct,
  removeProduct,
  listEnquiries,
  setEnquiryStatus,
  saveSettings,
  saveBrand,
  removeBrand,
  listBrandsAdmin,
  submitRepairEnquiry,
  listRepairEnquiries,
  updateRepairStatus,
  saveRefurbished,
  removeRefurbished,
  listRefurbishedAdmin,
  saveOffer,
  removeOffer,
  toggleOffer,
  listOffersAdmin,
  savePopup,
  togglePopup,
  listPopupsAdmin,
  saveGalleryItem,
  removeGalleryItem,
  listGalleryAdmin,
  saveHamperProduct,
  removeHamperProduct,
  listHamperProductsAdmin,
  createOrder,
  getOrderStatus,
  listOrdersAdmin,
  updateOrderStatus,
  updateDeliveryStatus,
  assignOrderBranches,
  verifyAndMarkPaid,
  listCustomersAdmin,
  saveBranch,
  removeBranch,
  listBranchesAdmin,
  getBranchInventoryAdmin,
  upsertBranchInventory,
  createTransfer,
  updateTransferStatus,
  listTransfersAdmin,
  saveSupplier,
  removeSupplier,
  listSuppliersAdmin,
  saveProductSource,
  listProductSourcesAdmin,
  saveThirdPartySource,
  listThirdPartySourcesAdmin,
  saveFinancePartner,
  removeFinancePartner,
  listFinancePartnersAdmin,
  saveDirectPartner,
  listDirectPartnersAdmin,
  type ProductInput,
} from "./admin.server";

// ─── Auth ─────────────────────────────────────────────────────
export const adminLogin = createServerFn({ method: "POST" })
  .validator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    const token = await createAdminSession(data.password);
    return { token };
  });

export const adminLogout = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await deleteAdminSession(data.token);
    return { ok: true };
  });

// ─── Products ────────────────────────────────────────────────
export const adminSaveProduct = createServerFn({ method: "POST" })
  .validator((d: { token: string; product: ProductInput }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return saveProduct(data.product);
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return removeProduct(data.id);
  });

// ─── Enquiries (legacy) ───────────────────────────────────────
export const adminListEnquiries = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listEnquiries();
  });

export const adminSetEnquiryStatus = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: string; status: "new" | "contacted" | "closed" }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return setEnquiryStatus(data.id, data.status);
  });

// ─── Settings ────────────────────────────────────────────────
export const adminSaveSettings = createServerFn({ method: "POST" })
  .validator((d: { token: string; entries: { key: string; value: string }[] }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return saveSettings(data.entries);
  });

// ─── Brands ──────────────────────────────────────────────────
export const adminSaveBrand = createServerFn({ method: "POST" })
  .validator((d: { token: string; brand: { id?: string; name: string; logo_url?: string | null; display_order?: number; is_active?: boolean } }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return saveBrand(data.brand);
  });

export const adminDeleteBrand = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return removeBrand(data.id);
  });

export const adminListBrands = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listBrandsAdmin();
  });

// ─── Repair Enquiries ─────────────────────────────────────────
export const publicSubmitRepair = createServerFn({ method: "POST" })
  .validator((d: {
    customer_name: string; phone: string; email?: string | null;
    phone_brand: string; phone_model: string; problem_type: string;
    description?: string | null; image_urls?: string[]; video_urls?: string[];
    preferred_contact?: string;
  }) => d)
  .handler(async ({ data }) => submitRepairEnquiry(data));

export const adminListRepairEnquiries = createServerFn({ method: "POST" })
  .validator((d: { token: string; status?: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listRepairEnquiries({ status: data.status });
  });

export const adminUpdateRepairStatus = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: string; status: string; admin_notes?: string | null }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return updateRepairStatus(data.id, data.status, data.admin_notes);
  });

// ─── Refurbished ──────────────────────────────────────────────
export const adminSaveRefurbished = createServerFn({ method: "POST" })
  .validator((d: { token: string; product: Record<string, unknown> & { id?: string } }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return saveRefurbished(data.product);
  });

export const adminDeleteRefurbished = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return removeRefurbished(data.id);
  });

export const adminListRefurbished = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listRefurbishedAdmin();
  });

// ─── Offers ───────────────────────────────────────────────────
export const adminSaveOffer = createServerFn({ method: "POST" })
  .validator((d: { token: string; offer: Record<string, unknown> & { id?: string } }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return saveOffer(data.offer);
  });

export const adminDeleteOffer = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return removeOffer(data.id);
  });

export const adminToggleOffer = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: string; is_active: boolean }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return toggleOffer(data.id, data.is_active);
  });

export const adminListOffers = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listOffersAdmin();
  });

// ─── Popups ───────────────────────────────────────────────────
export const adminSavePopup = createServerFn({ method: "POST" })
  .validator((d: { token: string; popup: Record<string, unknown> & { id?: string } }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return savePopup(data.popup);
  });

export const adminTogglePopup = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: string; is_enabled: boolean }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return togglePopup(data.id, data.is_enabled);
  });

export const adminListPopups = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listPopupsAdmin();
  });

// ─── Gallery ──────────────────────────────────────────────────
export const adminSaveGalleryItem = createServerFn({ method: "POST" })
  .validator((d: { token: string; item: Record<string, unknown> & { id?: string } }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return saveGalleryItem(data.item);
  });

export const adminDeleteGalleryItem = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return removeGalleryItem(data.id);
  });

export const adminListGallery = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listGalleryAdmin();
  });

// ─── Gift Hamper Products ──────────────────────────────────────
export const adminSaveHamperProduct = createServerFn({ method: "POST" })
  .validator((d: { token: string; product: Record<string, unknown> & { id?: string } }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return saveHamperProduct(data.product);
  });

export const adminDeleteHamperProduct = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return removeHamperProduct(data.id);
  });

export const adminListHamperProducts = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listHamperProductsAdmin();
  });

// ─── Orders ───────────────────────────────────────────────────
export const publicCreateOrder = createServerFn({ method: "POST" })
  .validator((d: Parameters<typeof createOrder>[0]) => d)
  .handler(async ({ data }) => createOrder(data));

export const publicGetOrderStatus = createServerFn({ method: "POST" })
  .validator((d: { order_number: string; phone: string }) => d)
  .handler(async ({ data }) => getOrderStatus(data.order_number, data.phone));

export const adminListOrders = createServerFn({ method: "POST" })
  .validator((d: { token: string; order_type?: string; order_status?: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listOrdersAdmin({ order_type: data.order_type, order_status: data.order_status });
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: string; order_status: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return updateOrderStatus(data.id, data.order_status);
  });

export const adminUpdateDeliveryStatus = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: string; delivery_status: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return updateDeliveryStatus(data.id, data.delivery_status);
  });

export const adminAssignOrderBranches = createServerFn({ method: "POST" })
  .validator((d: { token: string; order_id: string; source_branch_id: string | null; destination_branch_id: string | null }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return assignOrderBranches(data.order_id, data.source_branch_id, data.destination_branch_id);
  });

export const adminVerifyPayment = createServerFn({ method: "POST" })
  .validator((d: {
    token: string; order_id: string;
    payment_method: string; payment_gateway: string;
    gateway_payment_id?: string; transaction_id?: string;
  }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return verifyAndMarkPaid(data.order_id, data);
  });

// ─── Customers ────────────────────────────────────────────────
export const adminListCustomers = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listCustomersAdmin();
  });

// ─── Branches ─────────────────────────────────────────────────
export const adminSaveBranch = createServerFn({ method: "POST" })
  .validator((d: { token: string; branch: Record<string, unknown> & { id?: string } }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return saveBranch(data.branch);
  });

export const adminDeleteBranch = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return removeBranch(data.id);
  });

export const adminListBranches = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listBranchesAdmin();
  });

export const adminGetBranchInventory = createServerFn({ method: "POST" })
  .validator((d: { token: string; branch_id: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return getBranchInventoryAdmin(data.branch_id);
  });

export const adminUpsertBranchInventory = createServerFn({ method: "POST" })
  .validator((d: { token: string; branch_id: string; product_id: string; quantity: number; reserved_quantity: number }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return upsertBranchInventory(data.branch_id, data.product_id, data.quantity, data.reserved_quantity);
  });

// ─── Transfers ────────────────────────────────────────────────
export const adminCreateTransfer = createServerFn({ method: "POST" })
  .validator((d: { token: string; transfer: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return createTransfer(data.transfer);
  });

export const adminUpdateTransferStatus = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: string; transfer_status: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return updateTransferStatus(data.id, data.transfer_status);
  });

export const adminListTransfers = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listTransfersAdmin();
  });

// ─── Suppliers ────────────────────────────────────────────────
export const adminSaveSupplier = createServerFn({ method: "POST" })
  .validator((d: { token: string; supplier: Record<string, unknown> & { id?: string } }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return saveSupplier(data.supplier);
  });

export const adminDeleteSupplier = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return removeSupplier(data.id);
  });

export const adminListSuppliers = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listSuppliersAdmin();
  });

// ─── Product Sources ──────────────────────────────────────────
export const adminSaveProductSource = createServerFn({ method: "POST" })
  .validator((d: { token: string; source: Record<string, unknown> & { id?: string } }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return saveProductSource(data.source);
  });

export const adminListProductSources = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listProductSourcesAdmin();
  });

// ─── Third-Party Sources ──────────────────────────────────────
export const adminSaveThirdPartySource = createServerFn({ method: "POST" })
  .validator((d: { token: string; source: Record<string, unknown> & { id?: string } }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return saveThirdPartySource(data.source);
  });

export const adminListThirdPartySources = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listThirdPartySourcesAdmin();
  });

// ─── Finance Partners ─────────────────────────────────────────
export const adminSaveFinancePartner = createServerFn({ method: "POST" })
  .validator((d: { token: string; partner: Record<string, unknown> & { id?: string } }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return saveFinancePartner(data.partner);
  });

export const adminDeleteFinancePartner = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return removeFinancePartner(data.id);
  });

export const adminListFinancePartners = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listFinancePartnersAdmin();
  });

// ─── Direct Partners ──────────────────────────────────────────
export const adminSaveDirectPartner = createServerFn({ method: "POST" })
  .validator((d: { token: string; partner: Record<string, unknown> & { id?: string } }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return saveDirectPartner(data.partner);
  });

export const adminListDirectPartners = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await assertAdminSession(data.token);
    return listDirectPartnersAdmin();
  });
