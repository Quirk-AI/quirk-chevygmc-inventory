// src/utils/vehicleUrl.test.ts
import { describe, it, expect } from "vitest";
import { generateVehicleUrl } from "./vehicleUrl";
import { InventoryRow } from "../types";

const createMockRow = (overrides: Partial<InventoryRow>): InventoryRow => ({
  "Stock Number": "TEST001",
  Year: 2024,
  Make: "CHEVROLET",
  Model: "SILVERADO 1500",
  "Exterior Color": "WHITE",
  Trim: "LT",
  "Model Number": "CK10543",
  Cylinders: 8,
  Age: 10,
  MSRP: 50000,
  Status: "ON DEALER LOT",
  VIN: "1gcuyded1rz123456",
  Body: '4WD Crew Cab 147" w/1',
  ...overrides,
});

describe("generateVehicleUrl", () => {
  describe("Domain Routing", () => {
    it("routes Chevrolet to quirkchevynh.com", () => {
      const row = createMockRow({ Make: "CHEVROLET" });
      const url = generateVehicleUrl(row);
      expect(url).toContain("quirkchevynh.com");
    });

    it("routes GMC to quirkbuickgmc.com", () => {
      const row = createMockRow({
        Make: "GMC",
        Model: "SIERRA 1500",
        Body: '4WD Crew Cab 147"',
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("quirkbuickgmc.com");
    });

    it("routes Buick to quirkbuickgmc.com", () => {
      const row = createMockRow({
        Make: "BUICK",
        Model: "ENCLAVE",
        Body: "AWD 4dr",
        "Body Type": "suv",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("quirkbuickgmc.com");
    });
  });

  describe("Truck URLs", () => {
    it("generates correct URL for Silverado with crew cab", () => {
      const row = createMockRow({
        Make: "CHEVROLET",
        Model: "SILVERADO 1500",
        Trim: "LT",
        Body: '4WD Crew Cab 147" w/1',
        VIN: "1gcuyded1rz123456",
      });
      const url = generateVehicleUrl(row);
      expect(url).toBe(
        "https://www.quirkchevynh.com/inventory/new-2024-chevrolet-silverado-1500-lt-4wd-crew-cab-1gcuyded1rz123456/"
      );
    });

    it("uses four-wheel-drive for GMC Sierra instead of 4wd", () => {
      const row = createMockRow({
        Make: "GMC",
        Model: "SIERRA 1500",
        Trim: "SLE",
        Body: '4WD Crew Cab 147"',
        VIN: "1gtu9ael1rz999999",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("four-wheel-drive");
      expect(url).not.toMatch(/\/4wd\//);
    });

    it("handles double cab variant", () => {
      const row = createMockRow({
        Model: "SILVERADO 1500",
        Trim: "WT",
        Body: '4WD Double Cab 147" WT',
        VIN: "1gcpdbek1rz111111",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("double-cab");
    });

    it("handles regular cab variant", () => {
      const row = createMockRow({
        Model: "SILVERADO 1500",
        Trim: "WT",
        Body: '2WD Regular Cab 140" WT',
        VIN: "1gcnaaek1rz222222",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("regular-cab");
      expect(url).toContain("2wd");
    });

    it("defaults truck drive type to 4wd when not specified", () => {
      const row = createMockRow({
        Model: "SILVERADO 1500",
        Trim: "LT",
        Body: 'Crew Cab 147"',
        VIN: "1gcuyded1rz333333",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("4wd");
    });

    it("handles Silverado 2500HD model with HD suffix", () => {
      const row = createMockRow({
        Model: "SILVERADO 2500HD",
        Trim: "LTZ",
        Body: '4WD Crew Cab 172"',
        VIN: "1gc4yreyxrf444444",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("silverado-2500-hd");
    });

    it("handles Colorado truck URL", () => {
      const row = createMockRow({
        Model: "COLORADO",
        Trim: "Z71",
        Body: '4WD Crew Cab 128"',
        VIN: "1gcgtden1r1555555",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("colorado");
      expect(url).toContain("crew-cab");
    });
  });

  describe("Corvette URLs", () => {
    it("generates correct URL for Stingray coupe", () => {
      const row = createMockRow({
        Model: "CORVETTE",
        Trim: "3LT",
        Body: "2dr Stingray Cpe w/3LT",
        "Model Number": "1YC07",
        VIN: "1g1yb2d45r5666666",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("corvette");
      expect(url).toContain("stingray");
      expect(url).toContain("coupe");
      expect(url).toContain("rwd"); // Stingray defaults to rwd
    });

    it("generates correct URL for E-Ray convertible with AWD", () => {
      const row = createMockRow({
        Model: "CORVETTE",
        Trim: "3LZ",
        Body: "AWD 2dr E-Ray Conv w/3LZ",
        "Model Number": "1YK67",
        VIN: "1g1yc3d41r5777777",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("e-ray");
      expect(url).toContain("awd");
      expect(url).toContain("convertible"); // Model number contains "67"
    });

    it("generates correct URL for Z06 variant", () => {
      const row = createMockRow({
        Model: "CORVETTE",
        Trim: "1LZ",
        Body: "RWD 2dr Z06 Cpe w/1LZ",
        "Model Number": "1YZ07",
        VIN: "1g1yx2d47r5888888",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("z06");
      expect(url).toContain("rwd");
      expect(url).toContain("coupe");
    });

    it("defaults Corvette to rwd when no drive type in body", () => {
      const row = createMockRow({
        Model: "CORVETTE",
        Trim: "1LT",
        Body: "2dr Stingray Cpe w/1LT",
        "Model Number": "1YC07",
        VIN: "1g1yb2d45r5999999",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("rwd");
    });

    it("defaults E-Ray to awd when no drive type specified", () => {
      const row = createMockRow({
        Model: "CORVETTE",
        Trim: "1LZ",
        Body: "2dr E-Ray Cpe w/1LZ",
        "Model Number": "1YK07",
        VIN: "1g1yc3d40r5000000",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("awd");
    });
  });

  describe("SUV URLs", () => {
    it("generates suv body type for Tahoe", () => {
      const row = createMockRow({
        Model: "TAHOE",
        Trim: "LT",
        Body: "4WD 4dr LT",
        "Body Type": "suv",
        VIN: "1gnskakd1rr111111",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("tahoe");
      expect(url).toContain("suv");
    });

    it("generates suv body type for Suburban", () => {
      const row = createMockRow({
        Model: "SUBURBAN",
        Trim: "LT",
        Body: "4WD 4dr LT",
        "Body Type": "suv",
        VIN: "1gnskckd1rr222222",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("suburban");
      expect(url).toContain("suv");
    });

    it("generates correct URL for Equinox", () => {
      const row = createMockRow({
        Model: "EQUINOX",
        Trim: "LT",
        Body: "FWD 4dr LT",
        "Body Type": "suv",
        VIN: "3gnaxkeg1rs333333",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("equinox");
      expect(url).toContain("fwd");
      expect(url).toContain("suv");
    });

    it("generates correct URL for Traverse", () => {
      const row = createMockRow({
        Model: "TRAVERSE",
        Trim: "RS",
        Body: "AWD 4dr RS",
        "Body Type": "suv",
        VIN: "1gnerjkw1rj444444",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("traverse");
      expect(url).toContain("awd");
      expect(url).toContain("suv");
    });

    it("generates correct URL for Blazer", () => {
      const row = createMockRow({
        Model: "BLAZER",
        Trim: "LT",
        Body: "FWD 4dr LT",
        "Body Type": "suv",
        VIN: "3gnkbcrs1rs555555",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("blazer");
      expect(url).toContain("suv");
    });

    it("generates correct URL for Buick Enclave", () => {
      const row = createMockRow({
        Make: "BUICK",
        Model: "ENCLAVE",
        Trim: "Avenir",
        Body: "AWD 4dr Avenir",
        "Body Type": "suv",
        VIN: "5gaevckw1rj666666",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("quirkbuickgmc.com");
      expect(url).toContain("enclave");
      expect(url).toContain("all-wheel-drive");
      expect(url).toContain("suv");
    });

    it("generates correct URL for GMC Terrain", () => {
      const row = createMockRow({
        Make: "GMC",
        Model: "TERRAIN",
        Trim: "AT4",
        Body: "AWD 4dr AT4",
        "Body Type": "suv",
        VIN: "3gkaltev1rl777777",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("quirkbuickgmc.com");
      expect(url).toContain("terrain");
      expect(url).toContain("all-wheel-drive");
    });
  });

  describe("Edge Cases", () => {
    it("returns empty string for empty VIN", () => {
      const row = createMockRow({ VIN: "" });
      const url = generateVehicleUrl(row);
      expect(url).toBe("");
    });

    it("handles missing Body field gracefully", () => {
      const row = createMockRow({
        Model: "EQUINOX",
        Body: undefined,
        VIN: "3gnaxkeg1rs888888",
      });
      const url = generateVehicleUrl(row);
      expect(url).toBeTruthy();
      expect(url).toContain("equinox");
    });

    it("handles missing Trim field gracefully", () => {
      const row = createMockRow({
        Model: "TAHOE",
        Trim: "",
        Body: "4WD 4dr",
        VIN: "1gnskakd1rr999999",
      });
      const url = generateVehicleUrl(row);
      expect(url).toBeTruthy();
      expect(url).toContain("tahoe");
    });

    it("extracts drive type from Trim when not in Body", () => {
      const row = createMockRow({
        Model: "EQUINOX",
        Trim: "LT AWD",
        Body: "4dr LT",
        "Body Type": "suv",
        VIN: "3gnaxkeg1rs000001",
      });
      const url = generateVehicleUrl(row);
      expect(url).toContain("awd");
    });
  });
});
