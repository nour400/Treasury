// Copyright (c) 2025, Nour Boubes and contributors
// For license information, please see license.txt

frappe.ui.form.on("Treasury Window", {

    onload: function(frm) {
        if (frm.is_new()) {
            frm.set_value('posting_date', frappe.datetime.now_date());
        }
        frm.set_df_property('paid_to_account_balance', 'read_only', 1);
        frm.set_df_property('paid_to_account_currency', 'read_only', 1);
        frm.set_df_property('paid_to', 'read_only', 1);
        frm.refresh_field('paid_to');

        frm.set_df_property('paid_from_account_balance', 'read_only', 0);
        frm.set_df_property('paid_from_account_currency', 'read_only', 0);
        frm.set_df_property('paid_from', 'read_only', 0);
        frm.refresh_field('paid_from');
        frm.set_df_property('party_balance', 'read_only', 0);
    },
    setup: function (frm) {
        frm.set_query("party_type", function () {
            return {
                query: "erpnext.setup.doctype.party_type.party_type.get_party_type",
            };
        });
    },
    refresh: function(frm) {
        calculate_total(frm);
        console.log("calculate item on refresh")
    },
    payment_type: function(frm) {
        frm.set_value("paid_to","")
        frm.set_value("paid_to_account_currency","")
        frm.set_value("paid_to_account_balance","")
        frm.set_value("paid_from_account_balance","")
        frm.set_value("paid_from_account_currency","")
        frm.set_value("paid_from","")
        frm.set_value("party_balance","")
        frm.set_value("party_name","")
        frm.set_value("party",null)
        frm.set_value("party_type","")

        if (frm.doc.payment_type === "Receive") {
            frm.set_df_property('paid_to_account_balance', 'read_only', 1);
            frm.set_df_property('paid_to_account_currency', 'read_only', 1);
            frm.set_df_property('paid_to', 'read_only', 1);
            frm.refresh_field('paid_to');

            frm.set_df_property('paid_from_account_balance', 'read_only', 0);
            frm.set_df_property('paid_from_account_currency', 'read_only', 0);
            frm.set_df_property('paid_from', 'read_only', 0);
            frm.refresh_field('paid_from');
    
            frm.set_df_property('party_balance', 'read_only', 0);
            
            frappe.call({
                method: 'financial_treasury_gspa.financial_treasury_gspa.doctype.treasury_window.treasury_window.get_account_name',
                args: {
                    payment_type: frm.doc.payment_type,
                    treasury: frm.doc.treasury
                },
                callback: function(r) {
                    console.log("getting accounts",r.message)
                    if (r.message) {
                        frm.set_value('paid_to', r.message);
                    }
                }
            });            
        } else if (frm.doc.payment_type === "Pay") {
            frm.set_df_property('paid_to_account_balance', 'read_only', 0);
            frm.set_df_property('paid_to_account_currency', 'read_only', 0);
            frm.set_df_property('paid_to', 'read_only', 0);
            
            frm.set_df_property('paid_from_account_balance', 'read_only', 1);
            frm.set_df_property('paid_from_account_currency', 'read_only', 1);
            frm.set_df_property('paid_from', 'read_only', 1);
            frm.refresh_field('paid_from');

            frm.set_df_property('party_balance', 'read_only', 1);
            
            frappe.call({
                method: 'financial_treasury_gspa.financial_treasury_gspa.doctype.treasury_window.treasury_window.get_account_name',
                args: {
                    payment_type: frm.doc.payment_type,
                    treasury: frm.doc.treasury
                },
                callback: function(r) {
                    console.log("getting accounts",r.message)
                    if (r.message) {
                        frm.set_value('paid_from', r.message);
                    }
                }
            });
        }
    },



    party: function(frm) {
        if(frm.doc.party || !frm.doc.party.trim() === ''){

            return frappe.call({
                method: "erpnext.accounts.doctype.payment_entry.payment_entry.get_party_details",
                args: {
                    company: frm.doc.company,
                    party_type: frm.doc.party_type,
                    party: frm.doc.party,
                    date: frm.doc.posting_date,
                    cost_center: frm.doc.cost_center,
                },
                callback: function (r, rt) {
                    if (r.message) {
                        frappe.run_serially([
                            () => {
                                if (frm.doc.payment_type == "Receive") {
                                    frm.set_value("paid_from", r.message.party_account);
                                    frm.set_value(
                                        "paid_from_account_currency",
                                        r.message.party_account_currency
                                    );
                                    frm.set_value("paid_from_account_balance", r.message.account_balance);
                                } else if (frm.doc.payment_type == "Pay") {
                                    frm.set_value("paid_to", r.message.party_account);
                                    frm.set_value(
                                        "paid_to_account_currency",
                                        r.message.party_account_currency
                                    );
                                    frm.set_value("paid_to_account_balance", r.message.account_balance);
                                }
                            },
                            () => frm.set_value("party_balance", r.message.party_balance),
                            () => frm.set_value("party_name", r.message.party_name),
                            () => {
                                if (r.message.party_bank_account) {
                                    frm.set_value("party_bank_account", r.message.party_bank_account);
                                }
                                if (r.message.bank_account) {
                                    frm.set_value("bank_account", r.message.bank_account);
                                }
                            },
                        ]);
                    }
                },
            });
        }
    },
    treasury: function(frm) {
        if (frm.doc.payment_type === "Receive") {
            
            frappe.call({
                method: 'financial_treasury_gspa.financial_treasury_gspa.doctype.treasury_window.treasury_window.get_account_name',
                args: {
                    payment_type: frm.doc.payment_type,
                    treasury: frm.doc.treasury
                },
                callback: function(r) {
                    console.log("getting accounts",r.message)
                    if (r.message) {
                        frm.set_value('paid_to', r.message);
                    }
                }
            });            
        } else if (frm.doc.payment_type === "Pay") {
            
            frappe.call({
                method: 'financial_treasury_gspa.financial_treasury_gspa.doctype.treasury_window.treasury_window.get_account_name',
                args: {
                    payment_type: frm.doc.payment_type,
                    treasury: frm.doc.treasury
                },
                callback: function(r) {
                    console.log("getting accounts",r.message)
                    if (r.message) {
                        frm.set_value('paid_from', r.message);
                    }
                }
            });
        }
    }
});


frappe.ui.form.on('Treasury Item', {
    amount: function(frm, cdt, cdn) {
        calculate_total(frm);
        console.log("calculate item on amount change")

    },
    treasury_item_add: function(frm, cdt, cdn) {
        calculate_total(frm);
        console.log("calculate item on item add")

    },
    treasury_item_remove: function(frm) {
        calculate_total(frm);
        console.log("calculate item on item remove")
    }
});

function calculate_total(frm) {
    let total = 0;
    frm.doc.treasury_item.forEach(function(row) {
        if (row.amount) {
            total += flt(row.amount); 
        }
    });
    frm.set_value('total_does_not_include_tax', total);
    frm.refresh_field('total_does_not_include_tax');
}
