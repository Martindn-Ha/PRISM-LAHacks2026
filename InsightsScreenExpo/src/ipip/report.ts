import type { IpipDomainScore, IpipFacetScore, IpipScoreResults } from './scoring';
import {
  IPIP_DOMAIN_RAW_MAX,
  IPIP_DOMAIN_RAW_MIN,
  IPIP_FACET_RAW_MAX,
  IPIP_FACET_RAW_MIN,
} from './scoring';

export const IPIP_RESULTS_DISCLAIMER =
  'These raw scores describe everyday personality patterns — not a diagnosis.';

export type IpipRawReportFacetRow = {
  key: string;
  code: string;
  label: string;
  rawTotal: number;
  rawMin: number;
  rawMax: number;
  percentile: null;
  levelLabel: null;
  interpretation: null;
};

export type IpipRawReportDomainSection = {
  domain: IpipDomainScore['domain'];
  code: string;
  label: string;
  rawTotal: number;
  rawMin: number;
  rawMax: number;
  percentile: null;
  levelLabel: null;
  interpretation: null;
  facets: IpipRawReportFacetRow[];
};

export type IpipRawReport = {
  disclaimer: string;
  isComplete: boolean;
  domains: IpipRawReportDomainSection[];
};

function facetRow(facet: IpipFacetScore): IpipRawReportFacetRow {
  return {
    key: facet.key,
    code: `${facet.domain}${facet.facet}`,
    label: facet.label,
    rawTotal: facet.rawTotal,
    rawMin: IPIP_FACET_RAW_MIN,
    rawMax: IPIP_FACET_RAW_MAX,
    percentile: facet.percentile,
    levelLabel: facet.levelLabel,
    interpretation: facet.interpretation,
  };
}

function domainSection(domain: IpipDomainScore): IpipRawReportDomainSection {
  return {
    domain: domain.domain,
    code: domain.domain,
    label: domain.label,
    rawTotal: domain.rawTotal,
    rawMin: IPIP_DOMAIN_RAW_MIN,
    rawMax: IPIP_DOMAIN_RAW_MAX,
    percentile: domain.percentile,
    levelLabel: domain.levelLabel,
    interpretation: domain.interpretation,
    facets: domain.facets.map(facetRow),
  };
}

export function buildIpipRawReport(results: IpipScoreResults): IpipRawReport {
  return {
    disclaimer: IPIP_RESULTS_DISCLAIMER,
    isComplete: results.isComplete,
    domains: results.domains.map(domainSection),
  };
}
