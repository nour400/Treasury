# Copyright (c) 2025, Nour Boubes and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

from frappe import throw, _
from frappe.utils import getdate

class TreasuryWindow(Document):
	def on_submit(self):

		if not self.is_party_based_entry:
			try:
				je = frappe.new_doc("Journal Entry")
				je.voucher_type = "Journal Entry"
				je.custom_treasury_window= self.name
				treasury_doc = frappe.get_doc("Treasury", self.treasury)
				je.company = treasury_doc.company
				
				je.posting_date = self.posting_date
				
				is_pay = self.payment_type == "Pay"
				
				for item in self.treasury_item:
					account_entry = {
						"account": item.account,
						"cost_center": item.cost_center,
						"user_remark": item.description
					}
					
					if is_pay:
						account_entry["debit_in_account_currency"] = item.amount
					else:  # Receive
						account_entry["credit_in_account_currency"] = item.amount
					
					je.append("accounts", account_entry)
				
				if treasury_doc.mode_of_payment_account:
					if is_pay:
						contra_account = treasury_doc.mode_of_payment_account[0].credit_account
						contra_entry = {
							"account": contra_account,
							"credit_in_account_currency": self.total_does_not_include_tax,
							"cost_center": None,
							"user_remark": "Credit entry from Treasury Window (Payment)"
						}
					else:
						contra_account = treasury_doc.mode_of_payment_account[0].debit_account
						contra_entry = {
							"account": contra_account,
							"debit_in_account_currency": self.total_does_not_include_tax,
							"cost_center": None,
							"user_remark": "Debit entry from Treasury Window (Receipt)"
						}
					
					je.append("accounts", contra_entry)
				else:
					throw(_("No mode of payment account configured in Treasury {0}").format(self.treasury))
				
				je.insert()
				je.submit()
				
				frappe.msgprint(_("Journal Entry {0} created successfully").format(je.name))
				
			except Exception as e:
				frappe.throw(
					_("Failed to create Journal Entry: {0}. Treasury Window submission cancelled.").format(str(e)),
					title=_("Journal Entry Creation Failed")
				)
		else:
			try:
				pe = frappe.new_doc("Payment Entry")
				
				pe.posting_date = self.posting_date
				pe.payment_type = self.payment_type
				pe.company = self.company
				pe.party_bank_account = self.party_bank_account
				pe.bank_account = self.bank_account
				pe.party_name = self.party_name
				pe.party = self.party
				pe.party_type = self.party_type
				pe.paid_from_account_balance = self.paid_from_account_balance
				pe.paid_from_account_currency = self.paid_from_account_currency
				pe.party_balance = self.party_balance
				pe.paid_amount = self.paid_amount
				pe.received_amount = self.paid_amount
				pe.paid_to = self.paid_to
				
				pe.mode_of_payment = self.payment_way
				pe.paid_from = self.paid_from
				
				pe.custom_treasury_window = self.name
				
				pe.insert()
				pe.submit()
				
				frappe.msgprint(_("Payment Entry {0} created successfully").format(pe.name))
				
			except Exception as e:
				frappe.throw(
					_("Failed to create Payment Entry: {0}. Treasury Window submission cancelled.").format(str(e)),
					title=_("Payment Entry Creation Failed")
				)



@frappe.whitelist()
def get_account_name(treasury, payment_type):

	try:
		treasury_doc = frappe.get_doc("Treasury", treasury)
		print(f"\n treasury_doc {treasury_doc}")

		if not treasury_doc.get("mode_of_payment_account") or len(treasury_doc.mode_of_payment_account) == 0:
			frappe.throw("No accounts found in Treasury")
		first_account_row = treasury_doc.mode_of_payment_account[0]
		
		if payment_type == "Pay":
			return first_account_row.debit_account
		elif payment_type == "Receive":
			return first_account_row.credit_account
		else:
			frappe.throw("Invalid payment type")            
	except frappe.DoesNotExistError:
		frappe.throw(f"Treasury {treasury} not found")
	except Exception as e:
		frappe.throw(f"Error getting account name: {str(e)}")