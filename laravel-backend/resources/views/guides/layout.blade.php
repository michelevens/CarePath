<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $guide['title'] }} — CarePath</title>
    <style>
        @page { margin: 0.65in 0.6in 0.85in 0.6in; }
        body {
            font-family: 'Helvetica', sans-serif;
            color: #1c1917;
            font-size: 11pt;
            line-height: 1.55;
            margin: 0;
        }
        .brandbar {
            border-bottom: 3px solid #7c3aed;
            padding-bottom: 8pt;
            margin-bottom: 18pt;
        }
        .brandbar .logo {
            font-size: 16pt;
            font-weight: bold;
            letter-spacing: -0.4pt;
            color: #1c1917;
        }
        .brandbar .tagline {
            font-size: 8pt;
            color: #7c3aed;
            text-transform: uppercase;
            letter-spacing: 1pt;
            margin-top: 2pt;
        }
        .cover { margin-top: 40pt; }
        .cover-category {
            display: inline-block;
            background: #f5f3ff;
            color: #5b21b6;
            padding: 4pt 9pt;
            border-radius: 12pt;
            font-size: 8pt;
            font-weight: bold;
            letter-spacing: 0.6pt;
            text-transform: uppercase;
            margin-bottom: 14pt;
        }
        .cover h1 {
            font-size: 26pt;
            font-weight: bold;
            color: #1c1917;
            line-height: 1.15;
            margin: 0 0 10pt 0;
            letter-spacing: -0.5pt;
        }
        .cover .subtitle {
            font-size: 13pt;
            color: #57534e;
            line-height: 1.4;
            margin-bottom: 30pt;
        }
        .cover .meta {
            border-top: 1px solid #e7e5e4;
            border-bottom: 1px solid #e7e5e4;
            padding: 9pt 0;
            margin-top: 22pt;
            font-size: 9pt;
            color: #78716c;
        }
        .cover .meta span { display: inline-block; margin-right: 22pt; }
        .cover .meta strong { color: #1c1917; }
        .cover .byline {
            margin-top: 9pt;
            font-size: 9pt;
            color: #78716c;
        }
        .cover .byline strong { color: #1c1917; font-weight: 600; }
        h2 {
            font-size: 15pt;
            font-weight: bold;
            color: #1c1917;
            margin-top: 22pt;
            margin-bottom: 8pt;
            letter-spacing: -0.2pt;
            page-break-after: avoid;
        }
        h3 {
            font-size: 12pt;
            font-weight: bold;
            color: #1c1917;
            margin-top: 16pt;
            margin-bottom: 4pt;
            page-break-after: avoid;
        }
        p { margin: 0 0 9pt 0; }
        ul, ol { margin: 0 0 10pt 0; padding-left: 18pt; }
        li { margin-bottom: 4pt; }
        .lead {
            font-size: 12pt;
            color: #57534e;
            border-left: 3px solid #7c3aed;
            padding: 4pt 0 4pt 12pt;
            margin: 0 0 14pt 0;
        }
        .callout {
            background: #fafaf9;
            border: 1px solid #e7e5e4;
            border-left: 3px solid #7c3aed;
            padding: 11pt 14pt;
            margin: 12pt 0;
            font-size: 10pt;
        }
        .callout .label {
            font-weight: bold;
            color: #5b21b6;
            text-transform: uppercase;
            font-size: 8pt;
            letter-spacing: 0.6pt;
            margin-bottom: 4pt;
        }
        .checkbox {
            display: inline-block;
            width: 11pt;
            height: 11pt;
            border: 1.5px solid #57534e;
            border-radius: 2pt;
            margin-right: 7pt;
            vertical-align: middle;
        }
        .check-item { margin-bottom: 6pt; font-size: 10.5pt; }
        table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; }
        th, td { text-align: left; padding: 6pt 8pt; border-bottom: 1px solid #e7e5e4; vertical-align: top; }
        th { background: #fafaf9; font-weight: bold; color: #1c1917; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5pt; }
        .small { font-size: 9pt; color: #78716c; }
        .disclaimer {
            margin-top: 28pt;
            padding-top: 12pt;
            border-top: 1px solid #e7e5e4;
            font-size: 8pt;
            color: #78716c;
            line-height: 1.5;
        }
        .footer {
            position: fixed;
            bottom: -45pt;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8pt;
            color: #78716c;
        }
        .footer strong { color: #1c1917; }
        .pagenum:after { content: counter(page); }
        .totalpages:after { content: counter(pages); }
    </style>
</head>
<body>
    <div class="brandbar">
        <div class="logo">CarePath</div>
        <div class="tagline">Long-term care, modernized</div>
    </div>

    <div class="cover">
        <span class="cover-category">{{ strtoupper(str_replace('_', ' ', $guide['category'])) }}</span>
        <h1>{{ $guide['title'] }}</h1>
        <div class="subtitle">{{ $guide['subtitle'] }}</div>
        <div class="meta">
            <span><strong>For:</strong> {{ $guide['audience'] }}</span>
            <span><strong>Pages:</strong> {{ $guide['page_count'] }}</span>
            <span><strong>Updated:</strong> {{ $today }}</span>
        </div>
        @if(! empty($guide['author']))
            <div class="byline">
                Written by <strong>{{ $guide['author']['name'] }}</strong>
                @if(! empty($guide['reviewer']))
                    &nbsp;·&nbsp; Reviewed by <strong>{{ $guide['reviewer']['name'] }}</strong>
                @endif
            </div>
        @endif
    </div>

    @yield('content')

    <div class="disclaimer">
        This guide is general educational information from CarePath. It is not legal,
        medical, or financial advice. Rules vary by state and change over time. For
        decisions that affect your family, consult a licensed elder-law attorney,
        physician, or financial advisor in your state.
        <br><br>
        © {{ date('Y') }} CarePath. Source data from CMS Nursing Home Compare and the
        respective federal/state agencies. Distribute freely, do not modify.
    </div>

    <div class="footer">
        <strong>CarePath</strong> &nbsp;·&nbsp; carepath.io &nbsp;·&nbsp; No lead-selling, ever &nbsp;·&nbsp;
        Page <span class="pagenum"></span> of <span class="totalpages"></span>
    </div>
</body>
</html>
