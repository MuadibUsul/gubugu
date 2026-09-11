package com.gubugu.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class AppContractTest {
    @Test
    public void mainActivityPackage_isStable() {
        assertEquals("com.gubugu.app", MainActivity.class.getPackageName());
    }
}
