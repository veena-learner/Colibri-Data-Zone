import csv
import re

def get_ontology(model, column, description):
    m = model.lower().strip()
    c = column.lower().strip()
    d = description.lower().strip() if description else ""

    # ── Identity / Keys ──────────────────────────────────────────────────────
    if (re.match(r'.*_id$', c) or c == 'unique_id') and 'surrogate' in d:
        return "Surrogate Key"
    if c == 'unique_id':
        return "Surrogate Key"

    # ── Customer Domain ───────────────────────────────────────────────────────
    if c == 'customer_id':
        return "Customer > Identifier"
    if c in ('email', 'customer_email') and (
            'customer' in m or 'nursing' in m or 'hubspot' in m):
        return "Customer > Email Address"
    if c in ('first_name', 'last_name', 'full_name', 'customer_name',
             'entity_name', 'company_name') and 'transaction' not in m:
        return "Customer > Name"
    if c == 'customer_first_name':
        return "Customer > First Name"
    if c == 'customer_last_name':
        return "Customer > Last Name"
    if c == 'customer_type':
        return "Customer > Classification"
    if c in ('is_inactive', 'customer_deleted'):
        return "Customer > Status Flag"
    if c in ('status', 'status_description') and 'customer' in m:
        return "Customer > Status"
    if c == 'date_of_birth':
        return "Customer > Demographic"
    if c in ('do_not_email', 'do_not_mail', 'do_not_market'):
        return "Customer > Communication Preference"
    if c == 'first_sale_date':
        return "Customer > First Sale Date"
    if c == 'last_sale_date':
        return "Customer > Last Sale Date"
    if c == 'customer_extid':
        return "Customer > External Identifier"
    if c == 'customer_license_id':
        return "Customer > License Reference"

    # ── Organization / Brand ──────────────────────────────────────────────────
    if c == 'brand_id':
        return "Brand > Identifier"
    if c == 'brand_name' and 'email_campaign' not in m:
        return "Brand > Name"
    if c == 'ecosystem_id':
        return "Ecosystem > Identifier"
    if c == 'ecosystem_name':
        return "Ecosystem > Name"
    if c == 'subsidiary_id':
        return "Subsidiary > Identifier"
    if c == 'subsidiary':
        return "Subsidiary > Name"
    if c == 'top_parent_id':
        return "Corporate Hierarchy > Top Parent Identifier"
    if c == 'top_parent_company_name':
        return "Corporate Hierarchy > Top Parent Name"
    if c == 'parent_company_id':
        return "Corporate Hierarchy > Parent Identifier"
    if c == 'parent_company_name':
        return "Corporate Hierarchy > Parent Name"

    # ── Product / Catalog ─────────────────────────────────────────────────────
    if c in ('item_id', 'product_id'):
        return "Product > Identifier"
    if c == 'item_name':
        return "Product > Name"
    if c == 'product_name' and 'matomo' not in m:
        return "Product > Name"
    if c in ('item_type', 'product_type'):
        return "Product > Type Classification"
    if c == 'product_group' and 'free_trial' not in m:
        return "Product > Group"
    if c in ('course_id', 'netsuite_course_internal_id'):
        return "Course > Identifier"
    if c == 'course_name':
        return "Course > Name"
    if c == 'package_id':
        return "Product Bundle > Identifier"
    if c == 'package_name':
        return "Product Bundle > Name"
    if c == 'offering_id':
        return "Product Offering > Identifier"
    if c == 'offering_name':
        return "Product Offering > Name"
    if c == 'offering_type_id':
        return "Product Offering > Type"
    if c == 'course_type_id':
        return "Course > Type Identifier"
    if c == 'delivery_method_id':
        return "Delivery Method > Identifier"
    if c == 'delivery_method_name':
        return "Delivery Method > Name"
    if c == 'primary_education_type_name':
        return "Education Type > Primary Classification"
    if c == 'primary_state_code':
        return "Geographic > Primary State"
    if c == 'course_state_code':
        return "Geographic > Course State"

    # ── Education / Profession ────────────────────────────────────────────────
    if c == 'education_type_id':
        return "Education Type > Identifier"
    if c == 'education_type_name':
        return "Education Type > Name"
    if c == 'education_type' and 'email_campaign' in m:
        return "Email Campaign > Education Type"
    if c == 'education_type':
        return "Email Campaign > Education Type"
    if c == 'profession_id':
        return "Profession > Identifier"
    if c == 'profession_name':
        return "Profession > Name"
    if c == 'enrollment_id':
        return "Enrollment > Identifier"
    if c == 'enrollment_name':
        return "Enrollment > Name"
    if c == 'enrollment_date':
        return "Enrollment > Date"
    if c in ('enrolled_by_team', 'enrolled_by_method',
             'enrolled_by_id', 'enrolled_by_name'):
        return "Enrollment > Attribution"
    if c == 'hours':
        return "Education > Credit Hours"
    if c == 'is_part_of_a_membership':
        return "Product > Membership Flag"
    if c == 'school_name':
        return "Education Institution > Name"

    # ── License Domain ────────────────────────────────────────────────────────
    if c == 'nursing_license_id':
        return "License > Surrogate Identifier"
    if c == 'license_number':
        return "License > Number"
    if c in ('license_level_name', 'license_level_id'):
        return "License > Level"
    if c == 'license_state':
        return "License > Issuing State"
    if c == 'license_expiration_date':
        return "License > Expiration Date"
    if c == 'education_renewal_date':
        return "License > Education Renewal Date"
    if c == 'entity_type':
        return "Entity > Type Classification"
    if c == 'entity_id':
        return "Entity > Identifier"

    # ── Financial / Transaction ───────────────────────────────────────────────
    if c == 'transaction_id':
        return "Transaction > Identifier"
    if c == 'transaction_line_id':
        return "Transaction > Line Identifier"
    if c == 'transaction_ts':
        return "Transaction > Timestamp"
    if c == 'transaction_date':
        return "Transaction > Date"
    if c == 'transaction_type':
        return "Transaction > Type"
    if c == 'transaction_status' and 'stripe' not in m:
        return "Transaction > Status"
    if c == 'transaction_status' and 'stripe' in m:
        return "Payment > Status"
    if c == 'transaction_entity_id':
        return "Transaction > Entity Reference"
    if c == 'transaction_line_entity_id':
        return "Transaction > Line Entity Reference"
    if c == 'transaction_extid':
        return "Transaction > External Identifier"
    if c == 'transaction_discount_line':
        return "Transaction > Discount"
    if c == 'gross_amount':
        return "Financial > Gross Amount"
    if c == 'net_amount':
        return "Financial > Net Amount"
    if c == 'foreign_amount':
        return "Financial > Foreign Currency Amount"
    if c == 'credit_foreign_amount':
        return "Financial > Credit Foreign Amount"
    if c == 'debit_foreign_amount':
        return "Financial > Debit Foreign Amount"
    if c == 'rate_amount':
        return "Financial > Rate Amount"
    if c == 'rate_percent':
        return "Financial > Rate Percentage"
    if c == 'est_gross_profit':
        return "Financial > Estimated Gross Profit"
    if c == 'converted_amount':
        return "Financial > Net Amount (After Fees)"
    if c == 'converted_amount_fee':
        return "Financial > Processing Fee"
    if c == 'total_amount':
        return "Financial > Total Amount"
    if c == 'revenue':
        return "Revenue > Total"
    if c == 'revenue_subtotal':
        return "Revenue > Subtotal"
    if c == 'revenue_shipping':
        return "Revenue > Shipping"
    if c == 'revenue_tax':
        return "Revenue > Tax"
    if c == 'revenue_discount':
        return "Revenue > Discount"
    if c == 'item_price_avg':
        return "Revenue > Average Item Price"
    if c == 'promo_code':
        return "Promotion > Coupon Code"
    if c == 'account_id':
        return "Accounting > Account Identifier"
    if c == 'account_type':
        return "Accounting > Account Type"
    if c == 'refund_reason_id':
        return "Transaction > Refund Reason"
    if c == 'original_order_number':
        return "Transaction > Original Order Reference"
    if c == 'rev_rec_start_date':
        return "Financial > Revenue Recognition Start"
    if c == 'rev_rec_end_date':
        return "Financial > Revenue Recognition End"
    if c == 'order_id' and 'matomo' in m:
        return "Web Visit > Order Reference"
    if c == 'order_id':
        return "Transaction > Order Identifier"
    if c == 'payment_id':
        return "Transaction > Payment Identifier"

    # ── Geography ─────────────────────────────────────────────────────────────
    if c == 'state_id':
        return "Geographic > State Identifier"
    if c in ('state_code', 'address_state'):
        return "Geographic > State Code"
    if c == 'state_name':
        return "Geographic > State Name"
    if c == 'state_region':
        return "Geographic > State/Region Code"
    if c == 'country_id':
        return "Geographic > Country Identifier"
    if c == 'country_code':
        return "Geographic > Country Code"
    if c == 'country_name':
        return "Geographic > Country Name"
    if c == 'city':
        return "Geographic > City"
    if c in ('zip', 'zipcode', 'clean_zipcode'):
        return "Geographic > Postal Code"
    if c in ('address', 'address_line_1', 'address_line_2', 'clean_address') \
            and 'nursing_entity_blocking' not in m:
        return "Address > Street"
    if c == 'clean_street_number':
        return "Address > Street Number"
    if c == 'location_ip':
        return "Geographic > IP Address"
    if c == 'country' and (
            'search_console' in m or 'webmaster' in m or 'seo' in m):
        return "Geographic > Country Code"
    if c == 'geo_country':
        return "Geographic > Country"

    # ── Contact ───────────────────────────────────────────────────────────────
    if c in ('phone', 'customer_phone_number', 'contact_phone_number'):
        return "Contact > Phone Number"
    if c == 'clean_phone' and 'nursing_entity_blocking' not in m:
        return "Contact > Normalized Phone"
    if c == 'website':
        return "Contact > Website"

    # ── Call Center ───────────────────────────────────────────────────────────
    if c == 'call_id':
        return "Call > Identifier"
    if c == 'agent_name':
        return "Call > Agent Name"
    if c == 'skill':
        return "Call > Routing Skill"
    if c == 'brand_campaign':
        return "Call > Brand Campaign"
    if c == 'caller_phone_number':
        return "Call > Caller Phone"
    if c == 'call_date':
        return "Call > Date"
    if c == 'call_ts':
        return "Call > Timestamp"
    if c in ('call_time_seconds', 'total_call_time_seconds'):
        return "Call Metrics > Total Duration"
    if c in ('handle_time_seconds', 'total_handle_time_seconds'):
        return "Call Metrics > Handle Time"
    if c in ('ivr_time_seconds', 'total_ivr_time_seconds'):
        return "Call Metrics > IVR Duration"
    if c in ('after_call_work_time_seconds', 'total_after_call_work_time_seconds'):
        return "Call Metrics > After Call Work"
    if c in ('talk_time_seconds', 'total_talk_time_seconds'):
        return "Call Metrics > Talk Time"
    if c in ('ring_time_seconds', 'total_ring_time_seconds'):
        return "Call Metrics > Ring Time"
    if c == 'hold_time_seconds':
        return "Call Metrics > Hold Time"
    if c in ('queue_wait_time_seconds', 'total_queue_time_seconds'):
        return "Call Metrics > Queue Wait Time"
    if c == 'park_time_seconds':
        return "Call Metrics > Park Time"
    if c == 'dial_time_seconds':
        return "Call Metrics > Dial Time"
    if c == 'consult_time_seconds':
        return "Call Metrics > Consult Time"
    if c == 'manual_time_seconds':
        return "Call Metrics > Manual Time"
    if c == 'third_party_talk_time_seconds':
        return "Call Metrics > Third Party Talk Time"
    if c == 'talk_time_less_hold_and_park_seconds':
        return "Call Metrics > Net Talk Time"
    if c == 'time_to_abandon_call_seconds':
        return "Call Metrics > Time to Abandon"
    if c in ('call_billed_time_seconds', 'total_call_billed_time_seconds',
             'pci_call_billed_time_seconds'):
        return "Call Metrics > Billable Time"
    if c in ('pci_call_time_seconds', 'pci_handle_time_seconds',
             'pci_talk_time_seconds', 'pci_ring_time_seconds',
             'pci_ivr_time_seconds', 'pci_after_call_work_time_seconds'):
        return "Call Metrics > PCI Duration"
    if c == 'call_holds':
        return "Call Metrics > Hold Count"
    if c == 'has_call_transfer':
        return "Call Metrics > Transfer Flag"
    if c == 'is_call_answered':
        return "Call Metrics > Answered Flag"
    if c == 'is_call_missed':
        return "Call Metrics > Missed Flag"
    if c == 'is_call_abandoned':
        return "Call Metrics > Abandoned Flag"
    if c == 'is_within_sla':
        return "Call Metrics > SLA Compliance Flag"
    if c == 'is_first_call_resolution':
        return "Call Metrics > FCR Flag"
    if c == 'contacted_count':
        return "Call Metrics > Contact Count"
    if c == 'call_cost':
        return "Call Metrics > Call Cost"
    if c == 'has_pci_call':
        return "Call Metrics > PCI Call Flag"
    if c == 'call_transfers':
        return "Call Metrics > Transfer Count"

    # ── Marketing / Advertising ───────────────────────────────────────────────
    if c == 'clicks':
        return "Digital Marketing > Clicks"
    if c == 'impressions':
        return "Digital Marketing > Impressions"
    if c in ('conversions', 'custom_conversions'):
        return "Digital Marketing > Conversions"
    if c == 'spend':
        return "Digital Marketing > Spend"
    if c == 'leads':
        return "Digital Marketing > Leads"
    if c == 'campaign_name' and (
            'paid_search' in m or 'ads' in m):
        return "Marketing Campaign > Name"
    if c == 'campaign_id' and (
            'paid_search' in m or 'ads' in m):
        return "Marketing Campaign > Identifier"
    if c == 'advertising_channel_type':
        return "Marketing Campaign > Channel Type"
    if c == 'ad_network_type':
        return "Marketing Campaign > Ad Network"
    if c == 'engine':
        return "Traffic Source > Engine"
    if c == 'source' and (
            'paid_search' in m or 'ads' in m or 'matomo' in m):
        return "Traffic Source > Source"
    if c == 'device':
        return "Digital Marketing > Device Type"
    if c == 'brand' and 'paid_search' in m:
        return "Brand > Name"
    if c == 'site' and (
            'paid_search' in m or 'webmaster' in m):
        return "Digital Marketing > Site"
    if c in ('video_views', 'video_view_rate', 'average_cpv',
             'video_quartile_p_100_rate'):
        return "Digital Marketing > Video Metrics"

    # ── Email Marketing ───────────────────────────────────────────────────────
    if c == 'unique_key' and 'email_campaign' in m:
        return "Email Campaign > Surrogate Key"
    if c == 'campaign_name' and 'email_campaign' in m:
        return "Email Campaign > Name"
    if c == 'brand_name' and 'email_campaign' in m:
        return "Email Campaign > Brand"
    if c == 'profession' and 'email_campaign' in m:
        return "Email Campaign > Profession Target"
    if c == 'region':
        return "Email Campaign > Region"

    # ── UTM Attribution ───────────────────────────────────────────────────────
    if c in ('utm_source', 'first_utm_source', 'last_utm_source'):
        return "UTM Attribution > Source"
    if c in ('utm_medium', 'first_utm_medium', 'last_utm_medium'):
        return "UTM Attribution > Medium"
    if c in ('utm_campaign', 'first_utm_campaign', 'last_utm_campaign'):
        return "UTM Attribution > Campaign"
    if c in ('utm_content', 'first_utm_content', 'last_utm_content'):
        return "UTM Attribution > Content"
    if c in ('utm_term', 'first_utm_term', 'last_utm_term'):
        return "UTM Attribution > Term"
    if c == 'utm_adgroup':
        return "UTM Attribution > Ad Group"

    # ── Web Analytics / Visit ─────────────────────────────────────────────────
    if c == 'visit_id':
        return "Web Visit > Identifier"
    if c == 'visitor_id':
        return "Web Visitor > Identifier"
    if c == 'site_id':
        return "Web Site > Identifier"
    if c == 'site_name':
        return "Web Site > Name"
    if c == 'brand_group':
        return "Brand > Group"
    if c in ('entry_url', 'exit_url'):
        return "Web Visit > URL"
    if c in ('first_url', 'last_url'):
        return "Web Visit > URL Journey"
    if c in ('first_referrer', 'last_referrer', 'referer_url'):
        return "Web Visit > Referral URL"
    if c == 'referer_keyword':
        return "Web Visit > Search Keyword"
    if c == 'referer_name':
        return "Web Visit > Referrer Name"
    if c == 'referer_type':
        return "Web Visit > Referrer Type"
    if c in ('channeldetail_l4', 'channelcategory_l1',
             'channelgroup_dataflow_l3', 'channelclass_dataflow_l2',
             'channelspecific_dataflow_l5'):
        return "Marketing Channel > Classification"
    if c == 'campaign_source':
        return "UTM Attribution > Source"
    if c == 'campaign_medium':
        return "UTM Attribution > Medium"
    if c == 'general_source':
        return "Traffic Source > General Source"
    if c == 'general_medium':
        return "Traffic Source > General Medium"
    if c == 'adcontent':
        return "UTM Attribution > Content"
    if c == 'site_ecosystem':
        return "Ecosystem > Site Classification"
    if c == 'profession' and 'matomo' in m:
        return "Education > Profession Interest"
    if c == 'education' and 'matomo' in m:
        return "Education > Type Interest"
    if c == 'product_name' and 'matomo' in m:
        return "Product > Name"
    if c == 'product_price':
        return "Product > Price"
    if c == 'layer':
        return "Data Layer > Classification"
    if c == 'is_bounce':
        return "Web Behavior > Bounce Flag"
    if c == 'is_returning_visitor':
        return "Web Behavior > Returning Visitor Flag"
    if c == 'is_shopper':
        return "Web Behavior > Shopper Flag"
    if c == 'is_student':
        return "Web Behavior > Student Flag"
    if c == 'is_abandoned_cart':
        return "Web Behavior > Abandoned Cart Flag"
    if c == 'is_converted':
        return "Web Behavior > Conversion Flag"
    if c == 'count_of_bounces':
        return "Web Metrics > Bounce Count"
    if c == 'count_of_sessions':
        return "Web Metrics > Session Count"
    if c == 'count_of_users':
        return "Web Metrics > User Count"
    if c == 'duration_in_seconds':
        return "Web Metrics > Session Duration"
    if c == 'visitor_count_of_visits':
        return "Web Metrics > Visit Count"
    if c == 'count_of_orders':
        return "Web Metrics > Order Count"
    if c == 'count_of_items':
        return "Web Metrics > Item Count"
    if c in ('estimated_revenue', 'estimated_revenue_shipping'):
        return "Revenue > Estimated"
    if c == 'visit_date':
        return "Web Visit > Date"
    if c in ('visit_first_action_ts', 'visit_last_action_ts'):
        return "Web Visit > Action Timestamp"
    if c in ('num_visits', 'page_views'):
        return "Web Engagement > Metrics"
    if c in ('email_opens', 'email_clicks', 'email_bounces'):
        return "Email Engagement > Metrics"

    # ── CRM / HubSpot ─────────────────────────────────────────────────────────
    if c == 'contact_id':
        return "CRM Contact > Identifier"
    if c == 'source_model':
        return "Data Source > Model"
    if c in ('analytics_source', 'latest_source', 'source_data'):
        return "CRM Contact > Source Attribution"
    if c == 'object_source_label':
        return "CRM Contact > Creation Source"
    if c == 'lifecycle_stage':
        return "CRM Contact > Lifecycle Stage"
    if c in ('lead_date', 'mql_date', 'sql_date', 'opportunity_date',
             'customer_date', 'subscriber_date', 'other_date'):
        return "CRM Funnel > Stage Date"
    if c == 'created_date':
        return "Record > Creation Date"
    if c in ('days_to_lead', 'days_lead_to_mql', 'days_mql_to_sql',
             'days_sql_to_opportunity', 'days_opportunity_to_customer'):
        return "CRM Funnel > Conversion Duration"
    if c in ('first_touch_campaign', 'last_touch_campaign'):
        return "Marketing Attribution > Campaign Touch"

    # ── Identity Resolution / Blocking ────────────────────────────────────────
    if c in ('email_block', 'phone_block', 'zip_fname_street_block',
             'zip_fname_lname_block', 'clean_address_block', 'license_block'):
        return "Identity Resolution > Blocking Key"
    if c == 'clean_email':
        return "Identity Resolution > Normalized Email"
    if c == 'clean_phone' and 'nursing_entity_blocking' in m:
        return "Identity Resolution > Normalized Phone"
    if c in ('clean_last_name', 'clean_first_name'):
        return "Identity Resolution > Normalized Name"
    if c == 'clean_address' and 'nursing_entity_blocking' in m:
        return "Identity Resolution > Normalized Address"
    if c in ('last_name_soundex', 'first_name_soundex'):
        return "Identity Resolution > Phonetic Encoding"
    if c == 'is_institutional_address':
        return "Identity Resolution > Address Classification"

    # ── Search Console / SEO ──────────────────────────────────────────────────
    if c == 'search_ts':
        return "SEO > Report Date"
    if c == 'search_type':
        return "SEO > Search Type"
    if c == 'query':
        return "SEO > Search Query"
    if c in ('avg_impression_position', 'avg_click_position', 'position'):
        return "SEO > Ranking Position"
    if c == 'ctr':
        return "SEO > Click-Through Rate"
    if c == 'page':
        return "SEO > Page URL"

    # ── System / Audit ────────────────────────────────────────────────────────
    if c in ('_fivetran_synced_ts', '_fivetran_synced'):
        return "ETL Metadata > Fivetran Sync Timestamp"
    if c == 'dw_update_ts':
        return "ETL Metadata > DW Update Timestamp"
    if c in ('date_created', 'created_ts', 'contact_created_date'):
        return "Record > Creation Timestamp"
    if c in ('date_last_modified', 'last_modified_ts',
             'last_modified_date', 'contact_last_updated'):
        return "Record > Last Modified Timestamp"
    if c in ('source_name', 'source_system'):
        return "Data Source > System Name"
    if c == 'data_source':
        return "Data Source > System Name"
    if c == 'source_type':
        return "Data Source > Type"

    # ── Free Trial ────────────────────────────────────────────────────────────
    if c == 'trial_id':
        return "Free Trial > Identifier"
    if c == 'free_trial_date':
        return "Free Trial > Date"
    if c == 'tag_id':
        return "Marketing Tag > Identifier"
    if c == 'tag_name':
        return "Marketing Tag > Name"
    if c == 'product_group' and 'free_trial' in m:
        return "Product > Group"

    # ── Stripe / Payment ──────────────────────────────────────────────────────
    if c == 'payment_intent_id':
        return "Payment > Intent Identifier"
    if c == 'balance_transaction_id':
        return "Payment > Balance Transaction Identifier"
    if c == 'currency':
        return "Financial > Currency"

    # ── Netsuite ──────────────────────────────────────────────────────────────
    if c == 'sales_classification_id':
        return "Sales > Classification Identifier"

    # ── MAGI / LMS ────────────────────────────────────────────────────────────
    if c == 'enrollment_status_id':
        return "Enrollment > Status Identifier"
    if c == 'chapter_id':
        return "Course > Chapter Identifier"
    if c == 'chapter_page_id':
        return "Course > Chapter Page Identifier"
    if c == 'current_chapter_page_id':
        return "Course > Current Page Reference"
    if c == 'cycle':
        return "Learning > Attempt Count"
    if c == 'is_quiz':
        return "Learning > Quiz Flag"
    if c == 'start_time_ts':
        return "Learning > Start Timestamp"
    if c == 'end_time_ts':
        return "Learning > End Timestamp"

    # ── Campaign Name Split ───────────────────────────────────────────────────
    if c == 'spl_campaign_name':
        return "Email Campaign > Original Name"
    if c == 'spl_executor_name':
        return "Email Campaign > Executor Component"
    if c == 'spl_ecosystem_name':
        return "Email Campaign > Ecosystem Component"
    if c == 'spl_brand_name':
        return "Email Campaign > Brand Component"
    if c == 'spl_region_code':
        return "Email Campaign > Region Component"
    if c == 'spl_education_type':
        return "Email Campaign > Education Type Component"
    if c == 'spl_profession_name':
        return "Email Campaign > Profession Component"
    if c == 'spl_campaign_description':
        return "Email Campaign > Description Component"

    # ── Misc ──────────────────────────────────────────────────────────────────
    if c == 'web_source':
        return "Transaction > Web Source"
    if c == 'seminar_id':
        return "Event > Seminar Identifier"
    if c == 'partner_type':
        return "Partner > Type"
    if c == 'datasource_item_id':
        return "Data Source > Item Identifier"
    if c == 'method':
        return "Process > Method"
    if c == 'date' and (
            'paid_search' in m or 'ads' in m):
        return "Marketing Campaign > Date"
    if c == 'campaign_date':
        return "Marketing Campaign > Date"

    # ── Extended Customer / Contact ───────────────────────────────────────────
    # Broaden customer_name and customer_email to all models
    if c == 'customer_name':
        return "Customer > Name"
    if c == 'customer_email':
        return "Customer > Email Address"
    if c == 'email' and ('customer' in m or 'nursing' in m or 'hubspot' in m
                          or 'contact' in m or 'lead' in m or 'deal' in m
                          or 'student' in m or 'shopify' in m or 'stripe' in m
                          or 'teachable' in m or 'matomo' in m or 'keap' in m
                          or 'gravityforms' in m or 'dialogs' in m
                          or 'netsuite' in m or 'cybersource' in m):
        return "Customer > Email Address"
    if c == 'email':
        return "Customer > Email Address"
    if c == 'recipient_email':
        return "Email Marketing > Recipient Email"
    if c == 'company_name':
        return "Customer > Company Name"
    if c == 'company_id':
        return "Customer > Company Identifier"
    if c == 'top_parent_company_id':
        return "Corporate Hierarchy > Top Parent Identifier"

    # ── Campaign (general) ────────────────────────────────────────────────────
    if c == 'campaign_id':
        if 'hubspot' in m or 'eloqua' in m or 'email' in m or 'direct_mail' in m:
            return "Marketing Campaign > Identifier"
        return "Marketing Campaign > Identifier"
    if c == 'campaign_name':
        if 'hubspot' in m or 'eloqua' in m or 'email' in m or 'direct_mail' in m:
            return "Marketing Campaign > Name"
        return "Marketing Campaign > Name"
    if c == 'campaign_type':
        return "Marketing Campaign > Type"
    if c == 'campaign_date':
        return "Marketing Campaign > Date"

    # ── Brand (general) ───────────────────────────────────────────────────────
    if c == 'brand':
        return "Brand > Name"

    # ── Marketing Email / Events ──────────────────────────────────────────────
    if c == 'marketing_email_id':
        return "Email Marketing > Email Identifier"
    if c == 'marketing_email_name':
        return "Email Marketing > Email Name"
    if c == 'email_subject':
        return "Email Marketing > Subject Line"
    if c == 'email_type':
        return "Email Marketing > Type"
    if c in ('sent_ts', 'sent_date'):
        return "Email Marketing > Send Timestamp"
    if c in ('open_ts', 'click_ts', 'bounce_ts', 'unsubscribe_ts',
             'delivered_ts', 'spam_report_ts'):
        return "Email Marketing > Event Timestamp"
    if c in ('open_count', 'click_count', 'sent_count', 'delivered_count',
             'bounce_count', 'unsubscribe_count'):
        return "Email Marketing > Event Count"
    if c in ('is_opened', 'is_clicked', 'is_bounced', 'is_delivered',
             'is_unsubscribed', 'is_spam_report'):
        return "Email Marketing > Event Flag"
    if 'email' in m and c in ('event_type',):
        return "Email Marketing > Event Type"

    # ── HubSpot / CRM Extended ────────────────────────────────────────────────
    if c == 'deal_id':
        return "CRM Deal > Identifier"
    if c == 'owner_id':
        return "CRM > Owner Identifier"
    if c == 'team_id':
        return "CRM > Team Identifier"
    if c == 'account_name':
        return "CRM Account > Name"
    if c in ('first_touch_source', 'last_touch_source'):
        return "Marketing Attribution > Touch Source"
    if c in ('close_date', 'closed_date'):
        return "CRM Deal > Close Date"
    if c in ('deal_stage', 'stage_name', 'pipeline_stage'):
        return "CRM Deal > Stage"
    if c == 'pipeline_name':
        return "CRM Deal > Pipeline"
    if c in ('deal_amount', 'deal_value'):
        return "CRM Deal > Amount"
    if c == 'deal_type':
        return "CRM Deal > Type"
    if c in ('hubspot_id', 'hs_object_id'):
        return "CRM > HubSpot Object Identifier"
    if c == 'brand_marketing':
        return "Brand > Marketing Name"
    if c in ('activity_type',) and 'engagement' in m:
        return "CRM Engagement > Activity Type"
    if 'engagement' in m and c == 'engagement_id':
        return "CRM Engagement > Identifier"

    # ── Student / Learning ────────────────────────────────────────────────────
    if c == 'student_id':
        return "Student > Identifier"
    if c == 'student_bim_id':
        return "Student > External BIM Identifier"
    if c in ('section',) and ('student' in m or 'exam' in m or 'newt' in m or 'cpe' in m):
        return "Learning > Section"
    if c == 'exam_type':
        return "Assessment > Exam Type"
    if c in ('exam_score', 'score'):
        return "Assessment > Score"
    if c in ('pass_fail', 'exam_status') and ('exam' in m or 'student' in m):
        return "Assessment > Pass/Fail Status"
    if c == 'exam_date':
        return "Assessment > Exam Date"
    if c in ('study_time_seconds', 'study_hours'):
        return "Learning > Study Time"
    if c in ('completed_ts', 'completion_ts', 'completed_date'):
        return "Learning > Completion Timestamp"
    if c in ('progress_pct', 'progress_percent', 'percent_complete'):
        return "Learning > Progress Percentage"
    if c in ('tenant_id',) and ('student' in m or 'becker' in m or 'newt' in m):
        return "Learning Platform > Tenant Identifier"
    if c in ('session_id',) and ('student' in m or 'becker' in m or 'newt' in m):
        return "Learning > Session Identifier"
    if c == 'unit_id':
        return "Learning > Unit Identifier"
    if c == 'slide_id':
        return "Learning > Slide Identifier"
    if c == 'program_id':
        return "Learning > Program Identifier"
    if c == 'program_name':
        return "Learning > Program Name"
    if c == 'quiz_id':
        return "Assessment > Quiz Identifier"
    if c in ('question_id',):
        return "Assessment > Question Identifier"
    if c in ('answer_id',):
        return "Assessment > Answer Identifier"
    if c in ('is_correct',):
        return "Assessment > Correct Answer Flag"
    if c in ('attempt_number', 'attempt_count'):
        return "Assessment > Attempt Number"
    if c in ('affiliation_id',) and ('student' in m or 'newt' in m or 'becker' in m):
        return "Student > Affiliation Identifier"
    if c in ('firm_id',) and ('student' in m or 'newt' in m or 'becker' in m):
        return "Student > Firm Identifier"
    if c in ('firm_name',) and ('student' in m or 'newt' in m or 'becker' in m):
        return "Student > Firm Name"

    # ── Event / Activity ──────────────────────────────────────────────────────
    if c == 'event_id':
        return "Event > Identifier"
    if c == 'event_type':
        return "Event > Type"
    if c == 'event_ts':
        return "Event > Timestamp"
    if c == 'event_date':
        return "Event > Date"
    if c in ('activity_id',):
        return "Activity > Identifier"
    if c in ('activity_ts', 'activity_date'):
        return "Activity > Timestamp"

    # ── Shopify / E-Commerce ──────────────────────────────────────────────────
    if c in ('order_number',) and 'shopify' in m:
        return "Transaction > Order Number"
    if c in ('line_item_id',) and 'shopify' in m:
        return "Transaction > Line Item Identifier"
    if c in ('variant_id',) and 'shopify' in m:
        return "Product > Variant Identifier"
    if c in ('sku',):
        return "Product > SKU"
    if c in ('discount_code',):
        return "Promotion > Discount Code"

    # ── User / Account Generic ────────────────────────────────────────────────
    if c == 'user_id':
        return "User > Identifier"
    if c == 'user_name':
        return "User > Name"
    if c == 'id' and 'description' in d and 'unique' in d:
        return "Entity > Surrogate Identifier"
    if c == 'id':
        return "Entity > Identifier"

    # ── Financial Generic ─────────────────────────────────────────────────────
    if c == 'amount':
        return "Financial > Amount"
    if c == 'price':
        return "Product > Price"
    if c == 'quantity':
        return "Transaction > Quantity"
    if c == 'total':
        return "Financial > Total Amount"
    if c in ('fee', 'fees'):
        return "Financial > Fee Amount"
    if c in ('tax', 'tax_amount'):
        return "Financial > Tax Amount"
    if c in ('discount', 'discount_amount'):
        return "Financial > Discount Amount"
    if c == 'balance':
        return "Financial > Balance"
    if c in ('invoice_id',):
        return "Transaction > Invoice Identifier"

    # ── Status / Boolean Generic ──────────────────────────────────────────────
    if c == 'status':
        return "Record > Status"
    if c == 'is_active':
        return "Record > Active Flag"
    if c == 'is_deleted':
        return "Record > Deleted Flag"
    if c in ('is_enabled', 'is_disabled'):
        return "Record > Enabled Flag"
    if c in ('is_paid', 'is_refunded'):
        return "Transaction > Payment Status Flag"
    if c in ('is_cancelled', 'is_canceled'):
        return "Transaction > Cancellation Flag"
    if c in ('is_completed',):
        return "Transaction > Completion Flag"
    if c in ('is_test',):
        return "Record > Test Flag"
    if c.startswith('is_') and c.endswith('_flag'):
        return "Record > Status Flag"
    if c.startswith('is_') or c.startswith('has_'):
        return "Record > Status Flag"

    # ── Timestamps Generic ────────────────────────────────────────────────────
    if c == 'updated_ts':
        return "Record > Last Updated Timestamp"
    if c in ('updated_at', 'updated_date'):
        return "Record > Last Updated Timestamp"
    if c in ('created_at',):
        return "Record > Creation Timestamp"
    if c.endswith('_ts') and ('created' in c or 'create' in c):
        return "Record > Creation Timestamp"
    if c.endswith('_ts') and ('updated' in c or 'modified' in c):
        return "Record > Last Modified Timestamp"
    if c.endswith('_ts') and 'deleted' in c:
        return "Record > Deletion Timestamp"
    if c.endswith('_ts'):
        return "Record > Timestamp"
    if c.endswith('_date') and 'start' in c:
        return "Record > Start Date"
    if c.endswith('_date') and 'end' in c:
        return "Record > End Date"

    # ── Name Generic ──────────────────────────────────────────────────────────
    if c == 'name':
        if 'campaign' in m or 'email' in m:
            return "Marketing Campaign > Name"
        if 'product' in m or 'course' in m or 'item' in m:
            return "Product > Name"
        if 'customer' in m or 'contact' in m or 'student' in m:
            return "Customer > Name"
        return "Entity > Name"

    # ── Geography Generic ──────────────────────────────────────────────────────
    if c == 'state':
        return "Geographic > State Code"
    if c == 'country':
        return "Geographic > Country Code"

    # ── Profession / Education Generic ────────────────────────────────────────
    if c == 'profession':
        return "Profession > Name"

    # ── Section / Segment ────────────────────────────────────────────────────
    if c == 'section':
        return "Learning > Section"

    # ── Support / Ticket ─────────────────────────────────────────────────────
    if 'ticket' in m or 'support' in m:
        if c in ('ticket_id',):
            return "Support > Ticket Identifier"
        if c in ('ticket_status',):
            return "Support > Ticket Status"

    # ── Billing / Shipping Address ────────────────────────────────────────────
    if c == 'billing_address':
        return "Billing Address > Street"
    if c == 'billing_address_line_2':
        return "Billing Address > Line 2"
    if c == 'billing_city_name':
        return "Billing Address > City"
    if c == 'billing_state_code':
        return "Billing Address > State Code"
    if c == 'billing_zip_code':
        return "Billing Address > Postal Code"
    if c == 'billing_country_code':
        return "Billing Address > Country Code"
    if c == 'shipping_address':
        return "Shipping Address > Street"
    if c == 'shipping_address_line_2':
        return "Shipping Address > Line 2"
    if c == 'shipping_city_name':
        return "Shipping Address > City"
    if c == 'shipping_state_code':
        return "Shipping Address > State Code"
    if c == 'shipping_zip_code':
        return "Shipping Address > Postal Code"
    if c == 'shipping_country_code':
        return "Shipping Address > Country Code"

    # ── Site / Device Generic ─────────────────────────────────────────────────
    if c == 'site':
        return "Digital Marketing > Site"
    if c == 'device_type':
        return "Digital Marketing > Device Type"
    if c == 'type' and 'webmaster' in m:
        return "SEO > Result Type"
    if c == 'type':
        return "Entity > Type Classification"

    # ── Product Category ──────────────────────────────────────────────────────
    if c in ('category', 'product_category'):
        return "Product > Category"
    if c == 'category_id':
        return "Product > Category Identifier"
    if c == 'purchase_type':
        return "Transaction > Purchase Type"

    # ── Email Marketing Extended ──────────────────────────────────────────────
    if c == 'subject':
        return "Email Marketing > Subject Line"
    if c == 'email_id':
        return "Email Marketing > Email Identifier"
    if c == 'app_name' and 'hubspot' in m:
        return "Email Marketing > App Name"
    if c == 'subscription_name':
        return "Email Marketing > Subscription Name"
    if c == 'ab_variation':
        return "Email Marketing > A/B Variation"
    if c == 'subscription_id':
        return "Email Marketing > Subscription Identifier"
    if c == 'subscription_type':
        return "Email Marketing > Subscription Type"
    if c in ('opted_in', 'opted_out', 'subscribed', 'unsubscribed'):
        return "Email Marketing > Subscription Status"

    # ── HubSpot / CRM Extended 2 ──────────────────────────────────────────────
    if c == 'stage_id':
        return "CRM Deal > Stage Identifier"
    if c == 'team_name':
        return "CRM > Team Name"

    # ── Advertising Extended ──────────────────────────────────────────────────
    if c == 'ad_group_id':
        return "Digital Marketing > Ad Group Identifier"
    if c == 'ad_group_name':
        return "Digital Marketing > Ad Group Name"
    if c == 'ad_id':
        return "Digital Marketing > Ad Identifier"
    if c == 'action_type':
        return "Digital Marketing > Action Type"
    if c == 'conversions_value':
        return "Digital Marketing > Conversion Value"
    if c in ('paid_search_campaign_id',):
        return "Marketing Campaign > Identifier"

    # ── Partnership / B2B ────────────────────────────────────────────────────
    if c == 'partnership_id':
        return "Partnership > Identifier"
    if c == 'partnership_name':
        return "Partnership > Name"
    if c == 'partner_id':
        return "Partner > Identifier"
    if c == 'partner_name':
        return "Partner > Name"

    # ── Customer Segmentation ─────────────────────────────────────────────────
    if c == 'new_vs_returning':
        return "Customer > New/Returning Classification"
    if c == 'total_transactions':
        return "Customer > Transaction Count"
    if c in ('segment', 'customer_segment'):
        return "Customer > Segment"

    # ── Record / Entity Generic ───────────────────────────────────────────────
    if c == 'external_id':
        return "Entity > External Identifier"
    if c == 'record_id':
        return "Entity > Record Identifier"
    if c == 'parent_id':
        return "Entity > Parent Identifier"
    if c in ('script_id',):
        return "System > Script Identifier"
    if c == 'title' and 'customer' in m:
        return "Customer > Title"
    if c == 'title':
        return "Entity > Title"
    if c in ('description', 'desc'):
        return "Entity > Description"

    # ── Order / Transaction Extended ──────────────────────────────────────────
    if c == 'order_product_id':
        return "Transaction > Order Product Identifier"
    if c == 'order_item_id':
        return "Transaction > Order Item Identifier"
    if c in ('line_item_id',):
        return "Transaction > Line Item Identifier"
    if c in ('coupon_id',):
        return "Promotion > Coupon Identifier"

    # ── Person ────────────────────────────────────────────────────────────────
    if c == 'person_id':
        return "Person > Identifier"

    # ── Time Periods ──────────────────────────────────────────────────────────
    if c == 'year_week':
        return "Time Period > Year-Week"
    if c in ('year_month', 'year_quarter'):
        return "Time Period > Fiscal Period"
    if c == 'load_date':
        return "ETL Metadata > Load Date"

    # ── SEO Extended ─────────────────────────────────────────────────────────
    if c == 'search_date':
        return "SEO > Report Date"

    # ── Agent / Call Center Extended ──────────────────────────────────────────
    if c == 'group_id' and ('8x8' in m or 'agent' in m or 'call' in m):
        return "Call Center > Group Identifier"
    if c == 'group_name' and ('8x8' in m or 'agent' in m or 'call' in m):
        return "Call Center > Group Name"
    if c == 'group_id':
        return "Organization > Group Identifier"
    if c == 'group_name':
        return "Organization > Group Name"

    # ── ETL / System Metadata Extended ───────────────────────────────────────
    if c == '_fivetran_deleted':
        return "ETL Metadata > Fivetran Deleted Flag"
    if c.startswith('_fivetran_'):
        return "ETL Metadata > Fivetran Field"
    if c.startswith('_record_'):
        return "ETL Metadata > Record Metadata"
    if c in ('file_name',):
        return "ETL Metadata > Source File Name"
    if c in ('file_line_number', 'row_number'):
        return "ETL Metadata > Source File Line"
    if c in ('file_date',):
        return "ETL Metadata > File Date"
    if c == 'load_date':
        return "ETL Metadata > Load Date"
    if c == 'descriptive_name':
        return "Entity > Descriptive Name"

    # ── License / Product State ───────────────────────────────────────────────
    if c == 'license_type_id':
        return "License > Type Identifier"
    if c == 'product_state_id':
        return "Product > State Identifier"
    if c == 'product_state_name':
        return "Product > State Name"
    if c == 'platform_type_id':
        return "Product > Platform Type Identifier"
    if c == 'completion_status_id':
        return "Transaction > Completion Status Identifier"
    if c == 'course_version_id':
        return "Course > Version Identifier"

    # ── Multi-Value List Columns ──────────────────────────────────────────────
    if c in ('product_ids', 'product_skus'):
        return "Product > Identifiers (Multi-Value)"
    if c in ('product_names',):
        return "Product > Names (Multi-Value)"
    if c in ('product_categories',):
        return "Product > Categories (Multi-Value)"
    if c in ('professions', 'sales_professions'):
        return "Profession > Names (Multi-Value)"
    if c in ('education_types', 'sales_education_types'):
        return "Education Type > Names (Multi-Value)"
    if c in ('domains',):
        return "Web Visit > Domains (Multi-Value)"
    if c in ('touch_paths',):
        return "Web Visit > Page Paths (Multi-Value)"
    if c in ('order_ids',):
        return "Transaction > Order Identifiers (Multi-Value)"

    # ── Source Generic (non-ads context) ─────────────────────────────────────
    if c == 'source':
        return "Data Source > System Name"

    # ── Date / Calendar ───────────────────────────────────────────────────────
    if c == 'trandate':
        return "Transaction > Date"
    if c == 'date_day':
        return "Time Period > Calendar Date"
    if c == 'year_week':
        return "Time Period > Year-Week"
    if c in ('fiscal_year', 'fiscal_quarter', 'fiscal_month'):
        return "Time Period > Fiscal Period"

    # ── Discount / Promotion Extended ────────────────────────────────────────
    if c == 'discount_type':
        return "Promotion > Discount Type"
    if c == 'expiration_date' and ('discount' in m or 'coupon' in m or 'promo' in m):
        return "Promotion > Expiration Date"
    if c == 'expiration_date':
        return "Record > Expiration Date"

    # ── Subsidiary ───────────────────────────────────────────────────────────
    if c == 'subsidiary_name':
        return "Subsidiary > Name"

    # ── Email Send / Campaign ─────────────────────────────────────────────────
    if c == 'send_id':
        return "Email Marketing > Send Identifier"
    if c == 'from_address':
        return "Email Marketing > From Address"
    if c == 'from_name':
        return "Email Marketing > From Name"
    if c == 'triggered_send_id':
        return "Email Marketing > Triggered Send Identifier"

    # ── Financial Extended ────────────────────────────────────────────────────
    if c == 'total_revenue':
        return "Revenue > Total"
    if c == 'cost_micros':
        return "Digital Marketing > Spend (Micros)"
    if c == 'payment_method':
        return "Payment > Method"
    if c == 'order_status':
        return "Transaction > Order Status"

    # ── Call Center Extended ──────────────────────────────────────────────────
    if c == 'channel_id':
        return "Communication > Channel Identifier"
    if c == 'agent_id':
        return "Call > Agent Identifier"

    # ── Billing / Shipping Generic (name variants) ────────────────────────────
    if c == 'billing_state':
        return "Billing Address > State"
    if c == 'billing_country':
        return "Billing Address > Country"

    # ── Customer Name Components ──────────────────────────────────────────────
    if c == 'middle_name':
        return "Customer > Middle Name"

    # ── Generic ID Patterns ───────────────────────────────────────────────────
    # If column ends with _id, infer from the prefix
    if re.match(r'^[a-z_]+_id$', c):
        prefix = c[:-3].replace('_', ' ').title()
        return f"{prefix} > Identifier"

    # If column ends with _name, infer from the prefix
    if re.match(r'^[a-z_]+_name$', c):
        prefix = c[:-5].replace('_', ' ').title()
        return f"{prefix} > Name"

    # If column ends with _date, infer from the prefix
    if re.match(r'^[a-z_]+_date$', c):
        prefix = c[:-5].replace('_', ' ').title()
        return f"Record > {prefix} Date"

    # If column ends with _count or _total
    if re.match(r'^[a-z_]+_count$', c):
        prefix = c[:-6].replace('_', ' ').title()
        return f"Metric > {prefix} Count"

    # ── Fallback ──────────────────────────────────────────────────────────────
    return ""


# ── Read / Process / Write ────────────────────────────────────────────────────
input_file  = '/Users/veena.anantharam/Project-Dev/Colibri-Data-zone/dbt_column_descriptions editable copy(in).csv'
output_file = '/Users/veena.anantharam/Project-Dev/Colibri-Data-zone/dbt_column_descriptions_with_ontology.csv'

rows_total   = 0
rows_filled  = 0
rows_already = 0
rows_blank   = 0

output_rows = []

with open(input_file, newline='', encoding='utf-8-sig') as f:
    reader = csv.reader(f, quoting=csv.QUOTE_MINIMAL)
    header = next(reader)  # model, column, description, Ontology Definition

    for row in reader:
        # Pad row to exactly 4 columns if short
        while len(row) < 4:
            row.append('')

        model_val  = row[0]
        col_val    = row[1]
        desc_val   = row[2]
        ont_val    = row[3]

        rows_total += 1

        if ont_val.strip():
            # Already has a value — keep it
            rows_already += 1
            output_rows.append(row[:4])
        else:
            filled = get_ontology(model_val, col_val, desc_val)
            row[3] = filled
            if filled:
                rows_filled += 1
            else:
                rows_blank += 1
            output_rows.append(row[:4])

with open(output_file, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(header[:4] if len(header) >= 4 else
                    ['model', 'column', 'description', 'Ontology Definition'])
    writer.writerows(output_rows)

print("=" * 60)
print("Ontology Fill Summary")
print("=" * 60)
print(f"Total data rows processed : {rows_total}")
print(f"Already had ontology      : {rows_already}")
print(f"Newly filled by rules     : {rows_filled}")
print(f"Left blank (no match)     : {rows_blank}")
print(f"Output written to         : {output_file}")
print("=" * 60)
