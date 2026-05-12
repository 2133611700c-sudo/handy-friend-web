#!/usr/bin/env node
import fs from 'node:fs';

const target = 'index.html';
const pairs = [
  ["U2FtcGxlIEN1c3RvbWVyIEV4cGVyaWVuY2Vz","RXhhbXBsZSBQcm9qZWN0IFNjZW5hcmlvcw=="],
  ["SWxsdXN0cmF0aXZlIG9ubHkg4oCUIHJlYWwgdmVyaWZpZWQgcmV2aWV3cyBjb21pbmcgd2l0aCBvdXIgR29vZ2xlIEJ1c2luZXNzIGxhdW5jaC4=","SWxsdXN0cmF0aXZlIHByb2plY3QgZXhhbXBsZXMgb25seSDigJQgcmVhbCB2ZXJpZmllZCByZXZpZXdzIHdpbGwgYmUgYWRkZWQgYWZ0ZXIgR29vZ2xlIEJ1c2luZXNzIGxhdW5jaC4="],
  ["U2FyYWggTS4=","RXhhbXBsZSBB"],
  ["TWFyY3VzIFQu","RXhhbXBsZSBC"],
  ["SmVzc2ljYSBMLg==","RXhhbXBsZSBD"],
  ["SG9sbHl3b29kLCA5MDAyOA==","TG9jYWwgcHJvamVjdCBleGFtcGxl"],
  ["QmV2ZXJseSBIaWxscywgOTAyMTA=","TG9jYWwgcHJvamVjdCBleGFtcGxl"],
  ["TG9zIEZlbGl6LCA5MDAyNw==","TG9jYWwgcHJvamVjdCBleGFtcGxl"],
  ["RmViIDIwMjY=","RXhhbXBsZSBzY2VuYXJpbw=="],
  ["4q2Q4q2Q4q2Q4q2Q4q2Q", ""],
  ["IkFtYXppbmcgc2VydmljZSEgRml4ZWQgbXkgVFYgbW91bnRpbmcgaW4gMSBob3VyLiBQcm9mZXNzaW9uYWwgYW5kIHF1aWNrLiBIaWdobHkgcmVjb21tZW5kISI=","RXhhbXBsZTogVFYgbW91bnRpbmcgcmVxdWVzdCBjb21wbGV0ZWQgd2l0aCB3cml0dGVuIHNjb3BlIGFuZCBjbGVhbiBmaW5pc2gu"],
  ["IlVwZnJvbnQgcHJpY2luZyBhbmQgY2xlYXIgc2NvcGUgZnJvbSBzdGFydCB0byBmaW5pc2guIFNob3dlZCB1cCBvbiB0aW1lLCBjbGVhbmVkIHVwIGFmdGVyLiI=","RXhhbXBsZTogZnVybml0dXJlIGFzc2VtYmx5IHJlcXVlc3Qgd2l0aCB1cGZyb250IHdyaXR0ZW4gc2NvcGUgYW5kIGNsZWFudXAu"],
  ["IlBlcmZlY3QgZnVybml0dXJlIGFzc2VtYmx5ISBPbiB0aW1lLCBjbGVhbiwgYW5kIHN1cGVyIHJlbGlhYmxlLiBXaWxsIGNhbGwgYWdhaW4uIg==","RXhhbXBsZTogc21hbGwgaG9tZSBzZXJ2aWNlIHJlcXVlc3QgY29tcGxldGVkIGFmdGVyIHF1b3RlIGNvbmZpcm1hdGlvbi4="],
  ["QXJlIHlvdSBpbnN1cmVkPw==","V2hhdCB3b3JrIGNhbiB5b3UgaGFuZGxlPw=="],
  ["WWVzIOKAlCBHZW5lcmFsIExpYWJpbGl0eSBJbnN1cmFuY2UuIFdlJ3JlIGEgc21hbGwgbG9jYWwgdGVhbTsgd2UgaGFuZGxlIG1pbm9yIGhhbmR5bWFuIGpvYnMgdW5kZXIgJDUwMCBsYWJvci4gRm9yIGFueXRoaW5nIGJpZ2dlciBvciByZXF1aXJpbmcgcGVybWl0cywgd2UgcmVmZXIgeW91IHRvIGEgdHJhZGUgY29udHJhY3Rvci4=","V2UgaGFuZGxlIG1pbm9yIGhhbmR5bWFuIHdvcmsgd2l0aGluIENhbGlmb3JuaWEgbGltaXRzLiBQZXJtaXQtcmVxdWlyZWQsIHRyYWRlLXJlZ3VsYXRlZCwgb3IgbGFyZ2VyIHByb2plY3RzIGFyZSByZWZlcnJlZCB0byBhIHF1YWxpZmllZCB0cmFkZSBjb250cmFjdG9yLg=="],
  ["WWVzIOKAlCBHZW5lcmFsIExpYWJpbGl0eSBJbnN1cmFuY2Uu","V2UgaGFuZGxlIG1pbm9yIGhhbmR5bWFuIHdvcmsgd2l0aGluIENhbGlmb3JuaWEgbGltaXRzLg=="],
  ["bWlub3IgaGFuZHltYW4gam9icyB1bmRlciAkNTAwIGxhYm9y","bWlub3IgaGFuZHltYW4gd29yayB3aXRoaW4gQ2FsaWZvcm5pYSBsaW1pdHM="],
  ["OGFtLTdwbQ==","OGFtLThwbQ=="],
  ["OGFtIHRvIDdwbQ==","OGFtIHRvIDhwbQ=="],
  ["WWVzIOKAlCBNb24gdG8gU2F0IDhhbSB0byA3cG0uIFNhbWUtZGF5IGFuZCBuZXh0LWRheSBhdmFpbGFiaWxpdHkgbW9zdCB3ZWVrcy4gU3VuZGF5IGJ5IHNwZWNpYWwgcmVxdWVzdCBvbmx5Lg==","WWVzIOKAlCBNb24gdG8gU2F0IDhhbSB0byA4cG0uIFNhbWUtZGF5IGFuZCBuZXh0LWRheSBhdmFpbGFiaWxpdHkgbW9zdCB3ZWVrcy4gU3VuZGF5IGlzIG5vcm1hbGx5IG9mZi4="],
  ["U3VuZGF5IGJ5IHNwZWNpYWwgcmVxdWVzdCBvbmx5Lg==","U3VuZGF5IGlzIG5vcm1hbGx5IG9mZi4="],
  ["R2V0IFlvdXIgUXVvdGUgaW4gMiBNaW4=","R2V0IFlvdXIgUXVvdGUgUmVxdWVzdA=="],
  ["MTIrIHllYXJzIGZpeGluZyBMQSBob21lcy4=","RGlyZWN0IGxvY2FsIHNlcnZpY2Ugd2l0aCBjbGVhciB3cml0dGVuIHNjb3BlIGJlZm9yZSB3b3JrIHN0YXJ0cy4="],
  ["V2hhdCBpZiBzb21ldGhpbmcgYnJlYWtzIGFmdGVyPw==","V2hhdCBpZiBzb21ldGhpbmcgaXMgbm90IHJpZ2h0IGFmdGVyIHRoZSBqb2I/"],
  ["V2Ugc3RhbmQgYmVoaW5kIG91ciB3b3JrIGZvciAxIHllYXIuIEp1c3QgdGV4dCB1cyBhbmQgd2UgY29tZSBiYWNrLiBTYW1lLW51bWJlciB3YXJyYW50eSDigJQgbm8gcnVuYXJvdW5kLg==","SWYgc29tZXRoaW5nIGluIHRoZSBhZ3JlZWQgc2NvcGUgaXMgbm90IHJpZ2h0LCB0ZWxsIHVzIHdpdGhpbiA3IGRheXMgYW5kIHdlIHdpbGwgc2NoZWR1bGUgYSB0b3VjaC11cCBhdCBubyBleHRyYSBsYWJvciBjaGFyZ2Uu"],
  ["V3JvbmcgdG9vbHMsIGV4dHJhIHRyaXBz","VW5jbGVhciBzY29wZSwgZXh0cmEgdHJpcHM="],
  ["V2UgYnJpbmcgZXZlcnl0aGluZw==","V2UgY29uZmlybSBzY29wZSBhbmQgbWF0ZXJpYWxzIGZpcnN0"],
  ["U2FtZS1udW1iZXIgd2FycmFudHkg4oCUIGp1c3QgdGV4dCB1cw==","U2FtZS1udW1iZXIgZm9sbG93LXVwIOKAlCBqdXN0IHRleHQgdXM="],
  ["SGFuZHkgJiBGcmllbmQgaXMgTG9zIEFuZ2VsZXMncyB0cnVzdGVkIGhhbmR5bWFuIHNlcnZpY2Uu","SGFuZHkgJiBGcmllbmQgaXMgYSBsb2NhbCBMb3MgQW5nZWxlcyBoYW5keW1hbiBzZXJ2aWNlLg=="],
  ["cGFpbnQsIGV2ZW4gc3BhY2tsaW5nLiBZb3UgZG9uJ3QgaGF2ZSB0byBidXkgYW55dGhpbmcu","c3RhbmRhcmQgdG9vbHMgZm9yIHRoZSBhZ3JlZWQgc2NvcGUuIE1hdGVyaWFscyBhcmUgY29uZmlybWVkIGluIHdyaXRpbmcgd2hlbiBuZWVkZWQu"],
  ["bWlub3IgTWlub3IgUGx1bWJpbmcgRml4dHVyZXM=","TWlub3IgUGx1bWJpbmcgRml4dHVyZXM="]
];

const dec = (s) => Buffer.from(s, 'base64').toString('utf8');
let text = fs.readFileSync(target, 'utf8');
const original = text;
let count = 0;
for (const [a, b] of pairs) {
  const oldText = dec(a);
  const newText = dec(b);
  if (text.includes(oldText)) {
    text = text.split(oldText).join(newText);
    count += 1;
  }
}
if (text !== original) {
  fs.writeFileSync(target, text, 'utf8');
}
console.log(JSON.stringify({ target, changed: text !== original, replacementsApplied: count }, null, 2));
