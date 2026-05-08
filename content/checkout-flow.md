# Checkout Flow

The checkout flow manages procurement confirmation, invoice generation, payment processing, and shipment authorization. The workflow connects operational and financial systems before order execution.

## Order Finalization

Checkout validates supplier availability from [[suppliers]] together with tax requirements handled in [[gst-and-taxation]]. Shipment readiness from [[logistics]] and contract conditions negotiated in [[negotiation]] are reviewed before payment authorization.
