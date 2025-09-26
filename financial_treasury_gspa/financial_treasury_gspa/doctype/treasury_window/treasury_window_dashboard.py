from frappe import _


def get_data():
	return {
		"fieldname": "lead_filed_mapper",
		"non_standard_fieldnames": {
			"Journal Entry": "custom_treasury_window",
			"Payment Entry": "custom_treasury_window",

		},

		"transactions": [
			{"label": _("reference"), "items": ["Journal Entry"]},
			{"label": _("reference"), "items": ["Payment Entry"]},

		],
	}
